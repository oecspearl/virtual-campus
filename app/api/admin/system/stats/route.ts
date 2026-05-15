import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { PRIVATE_MEDIUM } from '@/lib/cache-headers';

// Safety net so a runaway tenant can't OOM the function. The per-tenant
// bucketing loads tenant_id for every row, so unbounded scans across
// memberships / courses / enrollments are the real risk.
// LONG-TERM: replace these three .select('tenant_id') pulls with a
// single Postgres function that does GROUP BY tenant_id server-side.
const PER_TABLE_ROW_CAP = 100_000;

// GET - Cross-tenant system stats (super_admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin'])) {
      return createAuthResponse('Forbidden: Super admin access required', 403);
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Fetch all tenants
    const { data: tenants } = await serviceSupabase
      .from('tenants')
      .select('id, name, slug, status, plan')
      .order('created_at', { ascending: false });

    // Aggregate counts
    const { count: totalUsers } = await serviceSupabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    const { count: totalCourses } = await serviceSupabase
      .from('courses')
      .select('id', { count: 'exact', head: true });

    const { count: totalEnrollments } = await serviceSupabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true });

    // Per-tenant member counts
    const { data: memberships } = await serviceSupabase
      .from('tenant_memberships')
      .select('tenant_id')
      .limit(PER_TABLE_ROW_CAP);

    const memberCounts: Record<string, number> = {};
    memberships?.forEach(m => {
      memberCounts[m.tenant_id] = (memberCounts[m.tenant_id] || 0) + 1;
    });

    // Per-tenant course counts
    const { data: courses } = await serviceSupabase
      .from('courses')
      .select('tenant_id')
      .limit(PER_TABLE_ROW_CAP);

    const courseCounts: Record<string, number> = {};
    courses?.forEach(c => {
      courseCounts[c.tenant_id] = (courseCounts[c.tenant_id] || 0) + 1;
    });

    // Per-tenant enrollment counts
    const { data: enrollments } = await serviceSupabase
      .from('enrollments')
      .select('tenant_id')
      .limit(PER_TABLE_ROW_CAP);

    const enrollmentCounts: Record<string, number> = {};
    enrollments?.forEach(e => {
      enrollmentCounts[e.tenant_id] = (enrollmentCounts[e.tenant_id] || 0) + 1;
    });

    const truncated =
      (memberships?.length ?? 0) >= PER_TABLE_ROW_CAP ||
      (courses?.length ?? 0) >= PER_TABLE_ROW_CAP ||
      (enrollments?.length ?? 0) >= PER_TABLE_ROW_CAP;

    const tenantsWithStats = (tenants || []).map(t => ({
      ...t,
      member_count: memberCounts[t.id] || 0,
      course_count: courseCounts[t.id] || 0,
      enrollment_count: enrollmentCounts[t.id] || 0,
    }));

    return NextResponse.json(
      {
        total_tenants: tenants?.length || 0,
        total_users: totalUsers || 0,
        total_courses: totalCourses || 0,
        total_enrollments: totalEnrollments || 0,
        tenants: tenantsWithStats,
        truncated,
      },
      { headers: PRIVATE_MEDIUM },
    );
  } catch (error) {
    console.error('System stats GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
