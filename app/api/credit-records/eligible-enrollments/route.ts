import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/credit-records/eligible-enrollments
 * Returns the caller's completed cross-tenant enrollments that can be submitted
 * for credit transfer to the current tenant. Each row is annotated with
 * `already_submitted` so the client can disable submitted rows.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const studentId = authResult.user!.id;

    // Completed cross-tenant enrollments in the student's tenant
    const { data: enrollments, error } = await tq
      .from('cross_tenant_enrollments')
      .select(`
        id, completed_at, source_course_id,
        source_tenant:tenants!cross_tenant_enrollments_source_tenant_id_fkey(id, name, slug),
        course:courses!cross_tenant_enrollments_source_course_id_fkey(id, title, subject_area, estimated_duration)
      `)
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Eligible enrollments error:', error);
      return NextResponse.json({ error: 'Failed to load enrollments' }, { status: 500 });
    }

    const rows = (enrollments || []) as any[];
    if (rows.length === 0) {
      return NextResponse.json({ enrollments: [] });
    }

    // Find which ones already have a non-withdrawn credit_record in this tenant
    const enrollmentIds = rows.map((e) => e.id);
    const { data: existing } = await tq
      .from('credit_records')
      .select('source_enrollment_id, status')
      .eq('student_id', studentId)
      .in('source_enrollment_id', enrollmentIds);

    const submittedMap = new Map<string, string>();
    for (const r of (existing || []) as { source_enrollment_id: string; status: string }[]) {
      if (r.source_enrollment_id && r.status !== 'withdrawn') {
        submittedMap.set(r.source_enrollment_id, r.status);
      }
    }

    const result = rows.map((e) => ({
      id: e.id,
      completed_at: e.completed_at,
      source_tenant: e.source_tenant,
      course: e.course,
      already_submitted: submittedMap.has(e.id),
      existing_status: submittedMap.get(e.id) || null,
    }));

    return NextResponse.json({ enrollments: result });
  } catch (error) {
    console.error('Eligible enrollments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
