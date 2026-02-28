import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { syncStudents } from '@/lib/sonisweb/student-sync';
import { syncEnrollments } from '@/lib/sonisweb/enrollment-sync';
import { pushAllGrades } from '@/lib/sonisweb/grade-passback';

/**
 * SonisWeb Sync Cron Job
 *
 * GET/POST /api/cron/sonisweb-sync
 *
 * Runs scheduled sync for all active SonisWeb connections.
 * Protected by CRON_SECRET bearer token.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Find all active SonisWeb connections with sync enabled
    const { data: connections, error } = await serviceSupabase
      .from('sonisweb_connections')
      .select('id, tenant_id, student_sync_enabled, enrollment_sync_enabled, grade_passback_enabled')
      .eq('sync_enabled', true)
      .eq('connection_status', 'connected');

    if (error) {
      console.error('Cron: Error fetching connections:', error);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active connections to sync',
        connections_processed: 0,
      });
    }

    const results = [];

    for (const conn of connections) {
      const connectionResult: Record<string, any> = {
        connection_id: conn.id,
        tenant_id: conn.tenant_id,
        syncs: {},
      };

      try {
        // Student sync
        if (conn.student_sync_enabled) {
          const studentResult = await syncStudents(conn.id, conn.tenant_id, undefined, 'cron');
          connectionResult.syncs.students = {
            status: studentResult.status,
            processed: studentResult.records_processed,
            created: studentResult.records_created,
            failed: studentResult.records_failed,
          };
        }

        // Enrollment sync
        if (conn.enrollment_sync_enabled) {
          const enrollResult = await syncEnrollments(conn.id, conn.tenant_id, undefined, 'cron');
          connectionResult.syncs.enrollments = {
            status: enrollResult.status,
            processed: enrollResult.records_processed,
            created: enrollResult.records_created,
            failed: enrollResult.records_failed,
          };
        }

        // Grade passback
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      connections_processed: connections.length,
      results,
    });
  } catch (error: any) {
    console.error('SonisWeb cron sync error:', error);
    return NextResponse.json({ error: error.message || 'Cron failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
