import { createServiceSupabaseClient } from './supabase-server';

/**
 * Checks if a student is enrolled in a course, either via regular enrollment
 * or cross-tenant enrollment (shared courses).
 *
 * Returns the enrollment record if found, or null if not enrolled.
 */
export async function checkStudentEnrollment(
  studentId: string,
  courseId: string
): Promise<{ enrolled: boolean; crossTenant: boolean; enrollmentId?: string; tenantId?: string }> {
  const supabase = createServiceSupabaseClient();

  // Check regular enrollment first (most common case)
  const { data: regularEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .single();

  if (regularEnrollment) {
    return { enrolled: true, crossTenant: false, enrollmentId: regularEnrollment.id };
  }

  // Check cross-tenant enrollment (shared courses)
  const { data: crossTenantEnrollment } = await supabase
    .from('cross_tenant_enrollments')
    .select('id, tenant_id')
    .eq('source_course_id', courseId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .single();

  if (crossTenantEnrollment) {
    return {
      enrolled: true,
      crossTenant: true,
      enrollmentId: crossTenantEnrollment.id,
      tenantId: crossTenantEnrollment.tenant_id,
    };
  }

  return { enrolled: false, crossTenant: false };
}

/**
 * Gets all enrolled student IDs for a course, including cross-tenant students.
 */
export async function getAllEnrolledStudentIds(courseId: string): Promise<string[]> {
  const supabase = createServiceSupabaseClient();

  const [regularResult, crossTenantResult] = await Promise.all([
    supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'active'),
    supabase
      .from('cross_tenant_enrollments')
      .select('student_id')
      .eq('source_course_id', courseId)
      .eq('status', 'active'),
  ]);

  const ids = new Set<string>();
  (regularResult.data || []).forEach(e => ids.add(e.student_id));
  (crossTenantResult.data || []).forEach(e => ids.add(e.student_id));

  return Array.from(ids);
}
