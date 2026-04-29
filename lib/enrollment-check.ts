import { createServiceSupabaseClient } from './supabase-server';
import { hasRole } from './rbac';

/**
 * Roles that bypass enrollment checks for course content access.
 * Tenant-scoping is still enforced by the caller's tenant query.
 */
const STAFF_ROLES = [
  'instructor',
  'curriculum_designer',
  'admin',
  'tenant_admin',
  'super_admin',
] as const;

export type CourseAccessUser = { id: string; role: string } | null;

export interface CourseAccessResult {
  allowed: boolean;
  status: number;            // suggested HTTP status when !allowed
  reason?: string;           // human-readable reason when !allowed
  isPublicAccess?: boolean;  // true when access was granted via is_public
  isStaff?: boolean;         // true when access was granted via staff role
  isEnrolled?: boolean;      // true when access was granted via enrollment
  crossTenant?: boolean;     // true when enrollment is via cross_tenant_enrollments
}

/**
 * Gate course content behind enrollment, with two opt-outs:
 *   - staff (instructor/admin/etc.) always pass
 *   - public courses (courses.is_public = true) allow read for everyone,
 *     including unauthenticated visitors
 *
 * Pass `requireWrite: true` for surfaces that mutate course state
 * (submissions, quiz attempts, posting in discussions). Writes ignore
 * is_public — they always require an active enrollment.
 *
 * Returns a structured result; callers inspect .allowed and use
 * .status / .reason to build their NextResponse.json error.
 */
export async function requireCourseAccess(
  user: CourseAccessUser,
  courseId: string,
  opts: { requireWrite?: boolean } = {},
): Promise<CourseAccessResult> {
  if (!courseId) {
    return { allowed: false, status: 400, reason: 'Course id is required' };
  }

  // Staff bypass — read or write.
  if (user && hasRole(user.role, STAFF_ROLES)) {
    return { allowed: true, status: 200, isStaff: true };
  }

  const supabase = createServiceSupabaseClient();

  // Two-step lookup so the gate keeps working before migration 041 runs:
  //   1. fetch the course (exists check)
  //   2. fetch is_public separately — if the column doesn't exist yet, the
  //      query errors and we treat the course as not-public (the safe default).
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) {
    console.error('requireCourseAccess: course existence lookup failed', {
      courseId,
      error: courseError.message,
    });
    return { allowed: false, status: 500, reason: 'Course access check failed' };
  }
  if (!course) {
    return { allowed: false, status: 404, reason: 'Course not found' };
  }

  let isPublic = false;
  const { data: publicRow, error: publicError } = await supabase
    .from('courses')
    .select('is_public')
    .eq('id', courseId)
    .maybeSingle();

  if (publicError) {
    // Most likely "column courses.is_public does not exist" because
    // migration 041 hasn't been applied. Continue with isPublic=false so
    // the route still works for staff + enrolled students.
    console.warn('requireCourseAccess: is_public column unavailable, treating course as not-public', {
      courseId,
      error: publicError.message,
    });
  } else if (publicRow) {
    isPublic = (publicRow as { is_public?: boolean }).is_public === true;
  }

  // Writes never use is_public — must be an authenticated enrolled student.
  if (opts.requireWrite) {
    if (!user) {
      return { allowed: false, status: 401, reason: 'Authentication required' };
    }
    const { enrolled, crossTenant } = await checkStudentEnrollment(user.id, courseId);
    return enrolled
      ? { allowed: true, status: 200, isEnrolled: true, crossTenant }
      : { allowed: false, status: 403, reason: 'You are not enrolled in this course' };
  }

  // Reads: public course is open to everyone, including guests.
  if (isPublic) {
    return { allowed: true, status: 200, isPublicAccess: true };
  }

  // Reads on a non-public course: must be enrolled.
  if (!user) {
    return { allowed: false, status: 401, reason: 'Authentication required' };
  }
  const { enrolled, crossTenant } = await checkStudentEnrollment(user.id, courseId);
  return enrolled
    ? { allowed: true, status: 200, isEnrolled: true, crossTenant }
    : { allowed: false, status: 403, reason: 'You are not enrolled in this course' };
}

/**
 * Returns the set of course IDs the user is currently enrolled in
 * (regular + cross-tenant). Used by surfaces that need to filter a list
 * of items down to courses the student can see — e.g. search results.
 */
export async function getEnrolledCourseIds(userId: string): Promise<string[]> {
  const supabase = createServiceSupabaseClient();
  const [regular, cross] = await Promise.all([
    supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', userId)
      .eq('status', 'active'),
    supabase
      .from('cross_tenant_enrollments')
      .select('source_course_id')
      .eq('student_id', userId)
      .eq('status', 'active'),
  ]);

  const ids = new Set<string>();
  (regular.data || []).forEach((r: any) => r.course_id && ids.add(r.course_id));
  (cross.data || []).forEach((r: any) => r.source_course_id && ids.add(r.source_course_id));
  return Array.from(ids);
}

/**
 * Returns the set of course IDs marked is_public within a tenant.
 * Used together with getEnrolledCourseIds to broaden student-visible
 * search/list results to "enrolled OR public."
 *
 * Returns [] silently when migration 041 hasn't run yet (column missing).
 */
export async function getPublicCourseIds(tenantId: string): Promise<string[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_public', true);
  if (error) {
    console.warn('getPublicCourseIds: is_public column unavailable, returning empty list', error.message);
    return [];
  }
  return (data || []).map((c: any) => c.id);
}

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
