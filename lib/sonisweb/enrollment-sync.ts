import { createTenantQuery } from '@/lib/tenant-query';
import { createSonisWebClient } from './client';
import { getFieldMappings, applyFieldMappings } from './field-mapping';
import type {
  SonisWebConnection,
  SyncResult,
  SyncError,
  TriggerType,
} from './types';

/**
 * Sync enrollments from SonisWeb to LMS.
 * Pulls enrollment records, creates/updates course enrollments and programme enrollments.
 */
export async function syncEnrollments(
  connectionId: string,
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
      sync_type: 'enrollments',
      trigger_type: triggerType,
      status: 'running',
      triggered_by: triggeredBy || null,
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
    const client = createSonisWebClient(conn);

    // Load field mappings
    const enrollmentMappings = await getFieldMappings(connectionId, 'enrollment', tenantId);
    const courseMappings = await getFieldMappings(connectionId, 'course', tenantId);

    // Load existing ID mappings
    const { data: userMappings } = await tq
      .from('sonisweb_id_mappings')
      .select('sonisweb_id, lms_id')
      .eq('connection_id', connectionId)
      .eq('entity_type', 'user');

    const userIdMap = new Map<string, string>();
    for (const m of userMappings || []) {
      userIdMap.set(m.sonisweb_id, m.lms_id);
    }

    const { data: courseMappingsData } = await tq
      .from('sonisweb_id_mappings')
      .select('sonisweb_id, lms_id')
      .eq('connection_id', connectionId)
      .eq('entity_type', 'course');

    const courseIdMap = new Map<string, string>();
    for (const m of courseMappingsData || []) {
      courseIdMap.set(m.sonisweb_id, m.lms_id);
    }

    // Fetch enrollment data from SonisWeb
    let sonisEnrollments: Record<string, any>[];
    const customQuery = conn.settings?.enrollment_sql_query;

    if (conn.api_mode === 'soapapi') {
      const result = await client.callApi('CFC.StuReg', 'getRegistration');
      if (!result.success) throw new Error(result.error || 'Failed to fetch enrollments');
      sonisEnrollments = result.data;
    } else {
      const sql = customQuery || "SELECT * FROM register WHERE enroll_stat = 'A'";
      const result = await client.executeSql(sql);
      if (!result.success) throw new Error(result.error || 'Failed to fetch enrollments');
      sonisEnrollments = result.data;
    }

    // Process each enrollment
    for (const sonisEnrollment of sonisEnrollments) {
      processed++;
      try {
        const mapped = applyFieldMappings(sonisEnrollment, enrollmentMappings);
        const studentSonisId = mapped._student_sonisweb_id || sonisEnrollment.soc_sec || sonisEnrollment.st_id;
        const courseSonisId = mapped._course_sonisweb_id || sonisEnrollment.crs_id;

        if (!studentSonisId || !courseSonisId) {
          errors.push({
            record_id: `row-${processed}`,
            error: 'Missing student or course ID',
            timestamp: new Date().toISOString(),
          });
          failed++;
          continue;
        }

        // Look up student
        const studentLmsId = userIdMap.get(studentSonisId);
        if (!studentLmsId) {
          errors.push({
            record_id: studentSonisId,
            error: `Student not found in LMS (SonisWeb ID: ${studentSonisId}). Run student sync first.`,
            timestamp: new Date().toISOString(),
          });
          failed++;
          continue;
        }

        // Look up or auto-create course
        let courseLmsId = courseIdMap.get(courseSonisId);
        if (!courseLmsId) {
          // Auto-create the course (unpublished)
          courseLmsId = await autoCreateCourse(
            tq, connectionId, courseSonisId, sonisEnrollment, courseMappings, tenantId
          );
          if (courseLmsId) {
            courseIdMap.set(courseSonisId, courseLmsId);
          } else {
            errors.push({
              record_id: courseSonisId,
              error: `Failed to auto-create course for ${courseSonisId}`,
              timestamp: new Date().toISOString(),
            });
            failed++;
            continue;
          }
        }

        // Get student data for denormalized fields
        const { data: student } = await tq
          .from('users')
          .select('name, email, role, gender')
          .eq('id', studentLmsId)
          .single();

        const enrollStatus = mapped.status || 'active';

        // Upsert enrollment
        const { error: enrollError } = await tq
          .from('enrollments')
          .upsert({
            student_id: studentLmsId,
            course_id: courseLmsId,
            status: enrollStatus,
            enrolled_at: new Date().toISOString(),
            student_name: student?.name || '',
            student_email: student?.email || '',
            student_role: student?.role || 'student',
            student_gender: student?.gender || null,
          }, { onConflict: 'student_id,course_id' });

        if (enrollError) {
          errors.push({
            record_id: `${studentSonisId}-${courseSonisId}`,
            error: enrollError.message,
            timestamp: new Date().toISOString(),
          });
          failed++;
          continue;
        }

        // Create enrollment ID mapping
        await tq
          .from('sonisweb_id_mappings')
          .upsert({
            connection_id: connectionId,
            entity_type: 'enrollment',
            sonisweb_id: `${studentSonisId}:${courseSonisId}`,
            lms_id: studentLmsId, // Using student ID as reference
            sonisweb_data: sonisEnrollment,
            sync_direction: 'pull',
          }, { onConflict: 'connection_id,entity_type,sonisweb_id' });

        created++;
      } catch (err: any) {
        errors.push({
          record_id: `row-${processed}`,
          error: err.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        failed++;
      }
    }

    const status = failed === 0 ? 'success' : (created > 0 || updated > 0 ? 'partial' : 'failed');

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
          error: err.message || 'Fatal sync error',
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
        error: err.message || 'Fatal sync error',
        timestamp: new Date().toISOString(),
      }],
    };
  }
}

/**
 * Auto-create a course in the LMS from SonisWeb enrollment data.
 * Created as unpublished so admin can review before making visible.
 */
async function autoCreateCourse(
  tq: ReturnType<typeof createTenantQuery>,
  connectionId: string,
  courseSonisId: string,
  enrollmentRecord: Record<string, any>,
  courseMappings: any[],
  tenantId: string
): Promise<string | null> {
  try {
    const mapped = applyFieldMappings(enrollmentRecord, courseMappings);
    const title = mapped.title || enrollmentRecord.crs_title || courseSonisId;
    const description = mapped.description || enrollmentRecord.crs_desc || '';

    const { data: course, error } = await tq
      .from('courses')
      .insert({
        title,
        description,
        published: false, // Unpublished by default — admin must review
        modality: 'online',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !course) {
      console.error('Auto-create course error:', error);
      return null;
    }

    // Create ID mapping
    await tq
      .from('sonisweb_id_mappings')
      .insert({
        connection_id: connectionId,
        entity_type: 'course',
        sonisweb_id: courseSonisId,
        lms_id: course.id,
        sonisweb_data: { crs_id: courseSonisId, crs_title: title },
        sync_direction: 'pull',
      });

    return course.id;
  } catch (err) {
    console.error('Auto-create course exception:', err);
    return null;
  }
}
