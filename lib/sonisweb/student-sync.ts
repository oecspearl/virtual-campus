import { createTenantQuery } from '@/lib/tenant-query';
import { generateSecurePassword } from '@/lib/crypto-random';
import { createSonisWebClient } from './client';
import { getFieldMappings, applyFieldMappings, validateRequiredFields } from './field-mapping';
import type {
  SonisWebConnection,
  SyncResult,
  SyncError,
  TriggerType,
} from './types';

/**
 * Sync students from SonisWeb to LMS.
 * Pulls student records, creates/updates LMS users, manages ID mappings.
 */
export async function syncStudents(
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
      sync_type: 'students',
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

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const conn = connection as SonisWebConnection;
    const client = createSonisWebClient(conn);

    // Load field mappings
    const mappings = await getFieldMappings(connectionId, 'student', tenantId);
    if (mappings.length === 0) {
      throw new Error('No student field mappings configured');
    }

    // Fetch students from SonisWeb
    let sonisStudents: Record<string, any>[];
    const customQuery = conn.settings?.student_sql_query;

    if (conn.api_mode === 'soapapi') {
      const result = await client.callApi('CFC.StuRec', 'getStudentList');
      if (!result.success) throw new Error(result.error || 'Failed to fetch students from SonisWeb API');
      sonisStudents = result.data;
    } else {
      const sql = customQuery || "SELECT * FROM name WHERE preferred = 1";
      const result = await client.executeSql(sql);
      if (!result.success) throw new Error(result.error || 'Failed to fetch students from SonisWeb SQL');
      sonisStudents = result.data;
    }

    // Load existing ID mappings for this connection
    const { data: existingMappings } = await tq
      .from('sonisweb_id_mappings')
      .select('sonisweb_id, lms_id, sonisweb_data')
      .eq('connection_id', connectionId)
      .eq('entity_type', 'user');

    const idMap = new Map<string, { lms_id: string; sonisweb_data: Record<string, any> }>();
    for (const m of existingMappings || []) {
      idMap.set(m.sonisweb_id, { lms_id: m.lms_id, sonisweb_data: m.sonisweb_data });
    }

    // Process each student
    const batchSize = conn.settings?.batch_size || 50;
    for (let i = 0; i < sonisStudents.length; i += batchSize) {
      const batch = sonisStudents.slice(i, i + batchSize);

      for (const sonisStudent of batch) {
        processed++;
        try {
          // Apply field mappings
          const mapped = applyFieldMappings(sonisStudent, mappings);
          const validation = validateRequiredFields(sonisStudent, mappings);

          if (!validation.valid) {
            errors.push({
              record_id: sonisStudent.soc_sec || sonisStudent.st_id || `row-${processed}`,
              error: `Missing required fields: ${validation.missing.join(', ')}`,
              timestamp: new Date().toISOString(),
            });
            failed++;
            continue;
          }

          // Determine the SonisWeb ID (soc_sec or st_id)
          const soniswebId = mapped._sonisweb_id || sonisStudent.soc_sec || sonisStudent.st_id;
          if (!soniswebId) {
            errors.push({
              record_id: `row-${processed}`,
              error: 'No SonisWeb student ID found',
              timestamp: new Date().toISOString(),
            });
            failed++;
            continue;
          }

          const email = mapped.email;
          if (!email) {
            errors.push({
              record_id: soniswebId,
              error: 'No email address found',
              timestamp: new Date().toISOString(),
            });
            failed++;
            continue;
          }

          const existing = idMap.get(soniswebId);

          if (existing) {
            // Existing student — check for changes
            const hasChanged = JSON.stringify(sonisStudent) !== JSON.stringify(existing.sonisweb_data);
            if (!hasChanged) {
              skipped++;
              continue;
            }

            // Update user record
            const updateFields: Record<string, any> = {};
            if (mapped.name) updateFields.name = mapped.name;
            if (mapped.gender) updateFields.gender = mapped.gender;

            if (Object.keys(updateFields).length > 0) {
              await tq
                .from('users')
                .update(updateFields)
                .eq('id', existing.lms_id);
            }

            // Update snapshot
            await tq
              .from('sonisweb_id_mappings')
              .update({
                sonisweb_data: sonisStudent,
                last_synced_at: new Date().toISOString(),
              })
              .eq('connection_id', connectionId)
              .eq('entity_type', 'user')
              .eq('sonisweb_id', soniswebId);

            updated++;
          } else {
            // New student — check if email already exists
            const { data: existingUser } = await tq
              .from('users')
              .select('id')
              .eq('email', email)
              .maybeSingle();

            if (existingUser) {
              // User exists — just create ID mapping
              await tq
                .from('sonisweb_id_mappings')
                .insert({
                  connection_id: connectionId,
                  entity_type: 'user',
                  sonisweb_id: soniswebId,
                  lms_id: existingUser.id,
                  sonisweb_data: sonisStudent,
                  sync_direction: 'pull',
                });
              skipped++;
              continue;
            }

            // Check if user exists globally (cross-tenant)
            const { data: globalUser } = await tq.raw
              .from('users')
              .select('id')
              .eq('email', email)
              .maybeSingle();

            if (globalUser) {
              // Add tenant membership for existing global user
              await tq.raw
                .from('tenant_memberships')
                .upsert({
                  tenant_id: tenantId,
                  user_id: globalUser.id,
                  role: conn.settings?.default_student_role || 'student',
                  is_primary: false,
                }, { onConflict: 'tenant_id,user_id' });

              // Create ID mapping
              await tq
                .from('sonisweb_id_mappings')
                .insert({
                  connection_id: connectionId,
                  entity_type: 'user',
                  sonisweb_id: soniswebId,
                  lms_id: globalUser.id,
                  sonisweb_data: sonisStudent,
                  sync_direction: 'pull',
                });

              created++;
              continue;
            }

            // Create new user
            const newUserId = await createLmsUser(tq, conn, mapped, email, tenantId);

            // Create ID mapping
            await tq
              .from('sonisweb_id_mappings')
              .insert({
                connection_id: connectionId,
                entity_type: 'user',
                sonisweb_id: soniswebId,
                lms_id: newUserId,
                sonisweb_data: sonisStudent,
                sync_direction: 'pull',
              });

            created++;
          }
        } catch (err: any) {
          errors.push({
            record_id: sonisStudent.soc_sec || sonisStudent.st_id || `row-${processed}`,
            error: err.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          });
          failed++;
        }
      }
    }

    // Determine final status
    const status = failed === 0 ? 'success' : (created > 0 || updated > 0 ? 'partial' : 'failed');

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

    // Update connection status
    await tq
      .from('sonisweb_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
      })
      .eq('id', connectionId);

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
    // Fatal error — update sync log
    await tq
      .from('sonisweb_sync_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        records_processed: processed,
        records_created: created,
        records_updated: updated,
        records_skipped: skipped,
        records_failed: failed,
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
 * Create a new LMS user from mapped SonisWeb data.
 * Follows the pattern from app/api/admin/users/invite/route.ts.
 */
async function createLmsUser(
  tq: ReturnType<typeof createTenantQuery>,
  conn: SonisWebConnection,
  mapped: Record<string, any>,
  email: string,
  tenantId: string
): Promise<string> {
  const role = conn.settings?.default_student_role || 'student';
  const name = mapped.name || email.split('@')[0];

  // Generate temporary password
  const tempPassword = generateTempPassword();

  // Create Supabase Auth user
  const { data: authData, error: authError } = await tq.raw.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: name, role },
  });

  if (authError) {
    throw new Error(`Auth creation failed for ${email}: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Create users table record
  const { error: userError } = await tq
    .from('users')
    .insert({
      id: userId,
      email,
      name,
      role,
      gender: mapped.gender || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (userError) {
    // Rollback auth user
    await tq.raw.auth.admin.deleteUser(userId);
    throw new Error(`User record creation failed for ${email}: ${userError.message}`);
  }

  // Create user profile
  await tq
    .from('user_profiles')
    .insert({
      user_id: userId,
      bio: '',
      avatar: null,
      learning_preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  // Create tenant membership
  await tq.raw
    .from('tenant_memberships')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role,
      is_primary: true,
    });

  // Send welcome email for welcome_email auth flow
  if (conn.auth_flow === 'welcome_email') {
    try {
      const { notifyStudentWelcome } = await import('@/lib/notifications');
      await notifyStudentWelcome(userId, { temporaryPassword: tempPassword });
    } catch (emailErr) {
      console.error(`Failed to send welcome email to ${email}:`, emailErr);
      // Don't fail the sync for email errors
    }
  }

  return userId;
}

function generateTempPassword(): string {
  return generateSecurePassword(12);
}
