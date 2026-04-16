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

/**
 * If the student is cross-tenant enrolled, syncs a grade to the cross_tenant_grades table
 * so it appears in the student's home tenant gradebook.
 *
 * No-ops silently if the student is not cross-tenant (regular enrollment).
 */
export async function syncCrossTenantGrade(opts: {
  studentId: string;
  courseId: string;
  assessmentType: 'quiz' | 'assignment' | 'discussion';
  assessmentId: string;
  score: number;
  maxScore: number;
  percentage: number;
  gradedBy?: string;
  feedback?: string | null;
}): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { data: crossEnrollment } = await supabase
    .from('cross_tenant_enrollments')
    .select('id, tenant_id')
    .eq('source_course_id', opts.courseId)
    .eq('student_id', opts.studentId)
    .eq('status', 'active')
    .single();

  if (!crossEnrollment) return; // Not cross-tenant, nothing to sync

  await supabase
    .from('cross_tenant_grades')
    .upsert({
      tenant_id: crossEnrollment.tenant_id,
      enrollment_id: crossEnrollment.id,
      student_id: opts.studentId,
      assessment_type: opts.assessmentType,
      assessment_id: opts.assessmentId,
      score: opts.score,
      max_score: opts.maxScore,
      percentage: opts.percentage,
      graded_by: opts.gradedBy || null,
      feedback: opts.feedback || null,
      graded_at: new Date().toISOString(),
    }, {
      onConflict: 'enrollment_id,assessment_type,assessment_id',
    });
}
