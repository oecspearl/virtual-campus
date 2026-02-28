import { createTenantQuery } from '@/lib/tenant-query';
import { createSonisWebClient } from './client';
import type {
  SonisWebConnection,
  GradeSyncConfig,
  GradeSyncItem,
  SyncResult,
  SyncError,
  TriggerType,
} from './types';

/**
 * Push grades for a specific course to SonisWeb.
 */
export async function pushCourseGrades(
  connectionId: string,
  courseId: string,
  tenantId: string,
  triggeredBy?: string,
  triggerType: TriggerType = 'manual'
): Promise<SyncResult> {
  const tq = createTenantQuery(tenantId);
  const errors: SyncError[] = [];
  let processed = 0, created = 0, updated = 0, skipped = 0, failed = 0;

  // Create sync log
  const { data: syncLog } = await tq
    .from('sonisweb_sync_logs')
    .insert({
      connection_id: connectionId,
      sync_type: 'grades',
      trigger_type: triggerType,
      status: 'running',
      triggered_by: triggeredBy || null,
      summary: { course_id: courseId },
    })
    .select('id')
    .single();

  const logId = syncLog?.id || 'unknown';

  try {
    // Load connection
    const { data: connection } = await tq
      .from('sonisweb_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) throw new Error(`Connection ${connectionId} not found`);

    const conn = connection as SonisWebConnection;

    // Grade passback requires soapapi (soapsql is read-only)
    if (conn.api_mode === 'soapsql') {
      throw new Error('Grade passback requires soapapi mode. The soapsql endpoint is read-only.');
    }

    const client = createSonisWebClient(conn);

    // Load grade sync config
    const { data: gradeConfig } = await tq
      .from('sonisweb_grade_sync_config')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('course_id', courseId)
      .single();

    if (!gradeConfig || !gradeConfig.enabled) {
      throw new Error('Grade sync is not configured or not enabled for this course');
    }

    const config = gradeConfig as GradeSyncConfig;
    const enabledItems = (config.grade_items || []).filter((item: GradeSyncItem) => item.enabled);

    if (enabledItems.length === 0) {
      throw new Error('No grade items are enabled for sync');
    }

    // Load student ID mappings
    const { data: userMappings } = await tq
      .from('sonisweb_id_mappings')
      .select('sonisweb_id, lms_id')
      .eq('connection_id', connectionId)
      .eq('entity_type', 'user');

    const lmsToSonisId = new Map<string, string>();
    for (const m of userMappings || []) {
      lmsToSonisId.set(m.lms_id, m.sonisweb_id);
    }

    // Process each enabled grade item
    for (const item of enabledItems) {
      // Fetch grades for this grade item
      const { data: grades } = await tq
        .from('course_grades')
        .select('student_id, score, max_score, percentage')
        .eq('course_id', courseId)
        .eq('grade_item_id', item.grade_item_id);

      if (!grades || grades.length === 0) continue;

      for (const grade of grades) {
        processed++;
        try {
          const soniswebStudentId = lmsToSonisId.get(grade.student_id);
          if (!soniswebStudentId) {
            skipped++;
            continue;
          }

          // Format grade value
          const gradeValue = formatGrade(grade, config.grade_format);

          // Push to SonisWeb via SOAP API
          const result = await client.callApi('CFC.StuReg', 'updateGrade', {
            student_id: soniswebStudentId,
            course_code: config.sonisweb_course_code || '',
            section: config.sonisweb_section || '',
            grade_column: item.sonisweb_column,
            grade_value: gradeValue,
          });

          if (!result.success) {
            errors.push({
              record_id: `${grade.student_id}:${item.grade_item_id}`,
              error: result.error || 'Grade passback failed',
              timestamp: new Date().toISOString(),
            });
            failed++;
          } else {
            updated++;
          }
        } catch (err: any) {
          errors.push({
            record_id: `${grade.student_id}:${item.grade_item_id}`,
            error: err.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          });
          failed++;
        }
      }
    }

    const status = failed === 0 ? 'success' : (updated > 0 ? 'partial' : 'failed');

    // Update sync log
    await tq
      .from('sonisweb_sync_logs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        records_processed: processed,
        records_created: created,
        records_updated: updated,
        records_skipped: skipped,
        records_failed: failed,
        error_details: errors,
      })
      .eq('id', logId);

    // Update grade sync config
    await tq
      .from('sonisweb_grade_sync_config')
      .update({
        last_passback_at: new Date().toISOString(),
        last_passback_status: status,
      })
      .eq('id', config.id);

    return {
      log_id: logId,
      status,
      records_processed: processed,
      records_created: created,
      records_updated: updated,
      records_skipped: skipped,
      records_failed: failed,
      errors,
    };
  } catch (err: any) {
    await tq
      .from('sonisweb_sync_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_details: [...errors, {
          record_id: 'system',
          error: err.message || 'Fatal error',
          timestamp: new Date().toISOString(),
        }],
      })
      .eq('id', logId);

    return {
      log_id: logId,
      status: 'failed',
      records_processed: processed,
      records_created: created,
      records_updated: updated,
      records_skipped: skipped,
      records_failed: failed + 1,
      errors: [...errors, {
        record_id: 'system',
        error: err.message || 'Fatal error',
        timestamp: new Date().toISOString(),
      }],
    };
  }
}

/**
 * Push a single grade (for auto-sync on grade save).
 */
export async function pushSingleGrade(
  connectionId: string,
  courseId: string,
  studentId: string,
  gradeItemId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const tq = createTenantQuery(tenantId);

  try {
    const { data: connection } = await tq
      .from('sonisweb_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) return { success: false, error: 'Connection not found' };

    const conn = connection as SonisWebConnection;
    if (conn.api_mode === 'soapsql') {
      return { success: false, error: 'Grade passback requires soapapi mode' };
    }

    const { data: config } = await tq
      .from('sonisweb_grade_sync_config')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('course_id', courseId)
      .single();

    if (!config?.enabled || config.sync_mode !== 'auto') {
      return { success: false, error: 'Auto-sync not enabled for this course' };
    }

    const gradeConfig = config as GradeSyncConfig;
    const item = (gradeConfig.grade_items || []).find(
      (i: GradeSyncItem) => i.grade_item_id === gradeItemId && i.enabled
    );

    if (!item) return { success: false, error: 'Grade item not configured for sync' };

    // Get SonisWeb student ID
    const { data: mapping } = await tq
      .from('sonisweb_id_mappings')
      .select('sonisweb_id')
      .eq('connection_id', connectionId)
      .eq('entity_type', 'user')
      .eq('lms_id', studentId)
      .single();

    if (!mapping) return { success: false, error: 'Student not mapped to SonisWeb' };

    // Get grade
    const { data: grade } = await tq
      .from('course_grades')
      .select('score, max_score, percentage')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .eq('grade_item_id', gradeItemId)
      .single();

    if (!grade) return { success: false, error: 'Grade not found' };

    const client = createSonisWebClient(conn);
    const gradeValue = formatGrade(grade, gradeConfig.grade_format);

    const result = await client.callApi('CFC.StuReg', 'updateGrade', {
      student_id: mapping.sonisweb_id,
      course_code: gradeConfig.sonisweb_course_code || '',
      section: gradeConfig.sonisweb_section || '',
      grade_column: item.sonisweb_column,
      grade_value: gradeValue,
    });

    return { success: result.success, error: result.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Push grades for all configured courses in a connection.
 */
export async function pushAllGrades(
  connectionId: string,
  tenantId: string,
  triggeredBy?: string,
  triggerType: TriggerType = 'manual'
): Promise<SyncResult> {
  const tq = createTenantQuery(tenantId);

  const { data: configs } = await tq
    .from('sonisweb_grade_sync_config')
    .select('course_id')
    .eq('connection_id', connectionId)
    .eq('enabled', true);

  if (!configs || configs.length === 0) {
    return {
      log_id: 'none',
      status: 'success',
      records_processed: 0,
      records_created: 0,
      records_updated: 0,
      records_skipped: 0,
      records_failed: 0,
      errors: [],
    };
  }

  let totalProcessed = 0, totalUpdated = 0, totalFailed = 0;
  const allErrors: SyncError[] = [];

  for (const config of configs) {
    const result = await pushCourseGrades(
      connectionId,
      config.course_id,
      tenantId,
      triggeredBy,
      triggerType
    );
    totalProcessed += result.records_processed;
    totalUpdated += result.records_updated;
    totalFailed += result.records_failed;
    allErrors.push(...result.errors);
  }

  const status = totalFailed === 0 ? 'success' : (totalUpdated > 0 ? 'partial' : 'failed');

  return {
    log_id: 'aggregate',
    status,
    records_processed: totalProcessed,
    records_created: 0,
    records_updated: totalUpdated,
    records_skipped: 0,
    records_failed: totalFailed,
    errors: allErrors,
  };
}

function formatGrade(
  grade: { score: number; max_score: number; percentage: number },
  format: string
): string {
  switch (format) {
    case 'percentage':
      return String(Math.round(grade.percentage * 100) / 100);
    case 'points':
      return `${grade.score}/${grade.max_score}`;
    case 'letter':
      return percentageToLetter(grade.percentage);
    default:
      return String(grade.percentage);
  }
}

function percentageToLetter(pct: number): string {
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-';
  if (pct >= 67) return 'D+';
  if (pct >= 63) return 'D';
  if (pct >= 60) return 'D-';
  return 'F';
}
