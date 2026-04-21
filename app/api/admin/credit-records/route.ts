import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/admin/credit-records
 * Registrar view: list credit-transfer submissions for the current tenant.
 *
 * Query params:
 *   status — filter by one status, or "open" for pending+under_review
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile!.role, ['super_admin', 'tenant_admin', 'admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    let query = tq
      .from('credit_records')
      .select(`
        id, source_type, issuing_institution_name,
        course_title, course_code, credits, awarded_credits,
        grade, grade_scale, completion_date, status,
        evidence_url, equivalence_notes, review_notes,
        reviewed_at, created_at, updated_at,
        student:users!credit_records_student_id_fkey(id, name, email),
        issuing_tenant:tenants!credit_records_issuing_tenant_id_fkey(id, name, slug),
        equivalent_course:courses!credit_records_equivalent_course_id_fkey(id, title),
        reviewer:users!credit_records_reviewed_by_fkey(id, name)
      `);

    if (statusFilter === 'open') {
      query = query.in('status', ['pending', 'under_review']);
    } else if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Admin credit records GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch credit records' }, { status: 500 });
    }

    // Summary counts for the queue header
    const countsQuery = await tq
      .from('credit_records')
      .select('status');

    const counts: Record<string, number> = {
      pending: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
    };
    for (const row of (countsQuery.data || []) as { status: string }[]) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }

    return NextResponse.json({ records: data || [], counts });
  } catch (error) {
    console.error('Admin credit records GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
