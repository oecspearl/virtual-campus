import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/transcript
 * Returns the authenticated student's transcript for the current tenant:
 *   - completed local enrollments (same-tenant courses)
 *   - completed cross-tenant enrollments (shared courses from other tenants)
 *   - approved credit transfer records
 *
 * Query params:
 *   student_id — optional; registrars may view another student's transcript
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const url = new URL(request.url);
    const requestedStudentId = url.searchParams.get('student_id');
    const callerRole = authResult.userProfile!.role;
    const isRegistrar = ['super_admin', 'tenant_admin', 'admin'].includes(callerRole);

    const studentId = requestedStudentId && isRegistrar
      ? requestedStudentId
      : authResult.user!.id;

    // Local enrollments (this tenant's own courses)
    const { data: localEnrollments } = await tq
      .from('enrollments')
      .select(`
        id, status, enrolled_at, completed_at,
        classes:classes!inner(
          id, name,
          courses:courses!inner(id, title, subject_area, difficulty, estimated_duration)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'completed');

    // Cross-tenant completions
    const { data: crossTenant } = await tq
      .from('cross_tenant_enrollments')
      .select(`
        id, status, enrolled_at, completed_at, progress_percentage,
        source_course_id,
        source_tenant:tenants!cross_tenant_enrollments_source_tenant_id_fkey(id, name, slug),
        course:courses!cross_tenant_enrollments_source_course_id_fkey(id, title, subject_area, difficulty)
      `)
      .eq('student_id', studentId)
      .eq('status', 'completed');

    // Approved credit transfers
    const { data: approvedCredits } = await tq
      .from('credit_records')
      .select(`
        id, course_title, course_code, credits, awarded_credits, grade, grade_scale,
        completion_date, issuing_institution_name, source_type, reviewed_at,
        equivalence_notes,
        equivalent_course:courses!credit_records_equivalent_course_id_fkey(id, title)
      `)
      .eq('student_id', studentId)
      .eq('status', 'approved');

    // Cross-tenant grades posted by this tenant's registrars/instructors for
    // the student's shared-course work. Join through the enrollment to
    // surface which shared course each grade belongs to.
    const { data: crossTenantGrades } = await tq
      .from('cross_tenant_grades')
      .select(`
        id, assessment_type, assessment_id, score, max_score, percentage, graded_at,
        enrollment:cross_tenant_enrollments!cross_tenant_grades_enrollment_id_fkey(
          source_course_id,
          source_tenant:tenants!cross_tenant_enrollments_source_tenant_id_fkey(id, name),
          course:courses!cross_tenant_enrollments_source_course_id_fkey(id, title)
        )
      `)
      .eq('student_id', studentId)
      .order('graded_at', { ascending: false, nullsFirst: false });

    // Student identity (for the transcript header)
    const { data: student } = await tq.raw
      .from('users')
      .select('id, name, email')
      .eq('id', studentId)
      .single();

    // Tenant identity (issuing institution for this transcript)
    const { data: tenant } = await tq.raw
      .from('tenants')
      .select('id, name, slug')
      .eq('id', tenantId)
      .single();

    return NextResponse.json({
      student,
      issuing_tenant: tenant,
      generated_at: new Date().toISOString(),
      local_completions: localEnrollments || [],
      cross_tenant_completions: crossTenant || [],
      transferred_credits: approvedCredits || [],
      cross_tenant_grades: crossTenantGrades || [],
    });
  } catch (error) {
    console.error('Transcript GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
