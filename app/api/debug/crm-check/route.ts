import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/debug/crm-check
 * Diagnostic endpoint: checks if CRM tables exist and returns actual Supabase errors.
 * Admin-only. Remove after debugging.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createServiceSupabaseClient();
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    const tables = [
      'crm_student_lifecycle',
      'crm_interactions',
      'crm_engagement_config',
      'crm_engagement_scores',
      'crm_segments',
      'crm_segment_members',
      'crm_campaigns',
      'crm_campaign_recipients',
      'crm_tasks',
      'crm_workflows',
      'crm_workflow_executions',
      'programmes',
      'programme_courses',
      'programme_enrollments',
      'programme_application_fields',
      'programme_applications',
    ];

    const results: Record<string, { exists: boolean; error?: string; count?: number }> = {};

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results[table] = { exists: false, error: `${error.code}: ${error.message}` };
      } else {
        results[table] = { exists: true, count: count ?? 0 };
      }
    }

    const existingCount = Object.values(results).filter(r => r.exists).length;
    const missingCount = Object.values(results).filter(r => !r.exists).length;

    return NextResponse.json({
      service_key_set: hasServiceKey,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
      summary: `${existingCount}/${tables.length} tables exist, ${missingCount} missing`,
      tables: results,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message,
    }, { status: 500 });
  }
}
