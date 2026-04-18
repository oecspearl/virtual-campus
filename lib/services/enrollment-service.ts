/**
 * Enrollment service — all business logic for reading/writing course
 * enrollments lives here. API routes are thin HTTP adapters that call
 * these functions; cron jobs and internal callers can use them directly.
 */

import type { TenantQuery } from '@/lib/tenant-query';

export interface EnrollmentListResult {
  enrollments: unknown[];
}

/**
 * List a specific student's active course enrollments, including nested
 * course and class metadata.
 */
export async function listStudentEnrollments(
  tq: TenantQuery,
  studentId: string
): Promise<EnrollmentListResult> {
  const { data, error } = await tq.raw
    .from('enrollments')
    .select(`
      id,
      course_id,
      student_id,
      class_id,
      status,
      enrolled_at,
      updated_at,
      courses (
        id,
        title,
        description,
        thumbnail,
        difficulty,
        grade_level,
        subject_area,
        published
      ),
      classes (
        id,
        name
      )
    `)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch enrollments: ${error.message}`);
  }

  return { enrollments: data || [] };
}

export interface ListAllEnrollmentsOptions {
  /** Max rows to return. Defaults to 200. */
  limit?: number;
}

/**
 * List all enrollments in the tenant — admin view. Includes nested course
 * and user info for display.
 */
export async function listAllEnrollments(
  tq: TenantQuery,
  options: ListAllEnrollmentsOptions = {}
): Promise<EnrollmentListResult> {
  const limit = options.limit ?? 200;

  const { data, error } = await tq.raw
    .from('enrollments')
    .select(`
      id,
      course_id,
      student_id,
      status,
      enrolled_at,
      updated_at,
      courses (
        id,
        title,
        published
      ),
      users (
        id,
        name,
        email
      )
    `)
    .order('enrolled_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch enrollments: ${error.message}`);
  }

  return { enrollments: data || [] };
}
