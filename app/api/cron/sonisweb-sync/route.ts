import { NextRequest } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { syncStudents } from '@/lib/sonisweb/student-sync';
import { syncEnrollments } from '@/lib/sonisweb/enrollment-sync';
import { pushAllGrades } from '@/lib/sonisweb/grade-passback';
import { withCronLock } from '@/lib/cron-lock';

/**
 * SonisWeb Sync Cron Job
 *
 * GET/POST /api/cron/sonisweb-sync
 *
 * Runs scheduled sync for all active SonisWeb connections.
 * Protected by CRON_SECRET and distributed lock.
 * Lock timeout: 15 minutes (long-running sync).
 */
export async function GET(request: NextRequest) {
  return withCronLock('sonisweb-sync', request, async () => {
    const serviceSupabase = createServiceSupabaseClient();

    const { data: connections, error } = await serviceSupabase
      .from('sonisweb_connections')
      .select('id, tenant_id, student_sync_enabled, enrollment_sync_enabled, grade_passback_enabled')
      .eq('sync_enabled', true)
      .eq('connection_status', 'connected');

    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`);
    }

    if (!connections || connections.length === 0) {
      return { message: 'No active connections to sync', connections_processed: 0 };
    }

    const results = [];

    for (const conn of connections) {
      const connectionResult: Record<string, any> = {
        connection_id: conn.id,
        tenant_id: conn.tenant_id,
        syncs: {},
      };

      try {
        if (conn.student_sync_enabled) {
          const studentResult = await syncStudents(conn.id, conn.tenant_id, undefined, 'cron');
          connectionResult.syncs.students = {
            status: studentResult.status,
            processed: studentResult.records_processed,
            created: studentResult.records_created,
            failed: studentResult.records_failed,
          };
        }

        if (conn.enrollment_sync_enabled) {
          const enrollResult = await syncEnrollments(conn.id, conn.tenant_id, undefined, 'cron');
          connectionResult.syncs.enrollments = {
            status: enrollResult.status,
            processed: enrollResult.records_processed,
            created: enrollResult.records_created,
            failed: enrollResult.records_failed,
          };
        }

        if (conn.grade_passback_enabled) {
          const gradeResult = await pushAllGrades(conn.id, conn.tenant_id, undefined, 'cron');
          connectionResult.syncs.grades = {
            status: gradeResult.status,
            processed: gradeResult.records_processed,
            updated: gradeResult.records_updated,
            failed: gradeResult.records_failed,
          };
        }
      } catch (err: any) {
        connectionResult.error = err.message;
      }

      results.push(connectionResult);
    }

    return { connections_processed: connections.length, results };
  }, 15); // 15-minute lock timeout for long sync
}

export async function POST(request: NextRequest) {
  return GET(request);
}
