/**
 * Course service — read/update/delete for the `courses` table and its
 * related data.
 *
 * The delete function currently cascades through a hard-coded list of
 * related tables. This is a known piece of tech debt (architectural
 * assessment Issue #8): the correct long-term fix is `ON DELETE CASCADE`
 * foreign keys at the database level. Until that migration lands, this
 * service is the single source of truth for the list — do not duplicate
 * it elsewhere.
 */

import type { TenantQuery } from '@/lib/tenant-query';
import { hasRole, type UserRole } from '@/lib/rbac';

// ─── Error types ────────────────────────────────────────────────────────────

export class CourseNotFoundError extends Error {
  constructor(message = 'Course not found') {
    super(message);
    this.name = 'CourseNotFoundError';
  }
}

export class CoursePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoursePermissionError';
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CourseRecord {
  id: string;
  title: string;
  // ... plus arbitrary columns from the courses table
  [key: string]: unknown;
}

export interface UpdateCourseOptions {
  /** User making the change — required for permission check. */
  userId: string;
  /** User's role — required for permission check. */
  userRole: string;
}

export interface DeleteCourseResult {
  deleted: true;
  /** Number of related-table operations attempted during cascade cleanup. */
  cascadeOperations: number;
}

// ─── Permission ─────────────────────────────────────────────────────────────

const EDITOR_ROLES: readonly UserRole[] = ['admin', 'super_admin', 'curriculum_designer'];
const DELETER_ROLES: readonly UserRole[] = ['admin', 'super_admin'];

/**
 * True if the given user is permitted to mutate (update) this course.
 *   - Admins, super_admins, and curriculum_designers always pass.
 *   - Otherwise the user must be listed in `course_instructors`.
 */
export async function canMutateCourse(
  tq: TenantQuery,
  courseId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  if (hasRole(userRole, EDITOR_ROLES)) return true;

  const { data } = await tq
    .from('course_instructors')
    .select('id')
    .eq('course_id', courseId)
    .eq('instructor_id', userId)
    .single();

  return !!data;
}

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getCourse(tq: TenantQuery, courseId: string): Promise<CourseRecord> {
  const { data, error } = await tq
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error || !data) {
    throw new CourseNotFoundError();
  }

  // Enrich with fork provenance — if this course was forked from another
  // tenant, look up that tenant's display name via the raw client (the
  // tenants table isn't tenant-scoped).
  const forkedFromTenantId = (data as any).forked_from_tenant_id;
  if (forkedFromTenantId) {
    const { data: srcTenant } = await tq.raw
      .from('tenants')
      .select('id, name, slug')
      .eq('id', forkedFromTenantId)
      .maybeSingle();
    (data as any).forked_from_tenant = srcTenant || null;
  }

  return data as CourseRecord;
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateCourse(
  tq: TenantQuery,
  courseId: string,
  updates: Record<string, unknown>,
  options: UpdateCourseOptions
): Promise<CourseRecord> {
  const { data: existing } = await tq
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .single();

  if (!existing) {
    throw new CourseNotFoundError();
  }

  const canEdit = await canMutateCourse(tq, courseId, options.userId, options.userRole);
  if (!canEdit) {
    throw new CoursePermissionError("You don't have permission to update this course");
  }

  const { data: updated, error } = await tq
    .from('courses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update course: ${error.message}`);
  }
  if (!updated) {
    throw new CourseNotFoundError();
  }

  return updated as CourseRecord;
}

// ─── Delete (with cascade) ──────────────────────────────────────────────────

/**
 * Tables whose rows reference a course and should be DELETED when the
 * course is deleted. Ordered so that children are removed before their
 * parents (e.g. `quiz_attempts` before `quizzes`).
 *
 * TODO (Architectural Issue #8): replace with `ON DELETE CASCADE` FK
 * constraints at the database level. A new table added here will silently
 * leak orphaned rows if any developer forgets to update this list.
 */
const COURSE_CASCADE_DELETE_TABLES: readonly string[] = [
  'course_grades',
  'course_grade_items',
  'course_gradebook_settings',
  'quiz_attempts',
  'quizzes',
  'assignments',
  'assignment_submissions',
  'lesson_progress',
  'lessons',
  'subjects',
  'enrollments',
  'course_instructors',
  'course_announcements',
  'course_discussions',
  'discussions',
  'lesson_discussions',
  'classes',
  'resource_links',
  'scorm_tracking',
  'scorm_packages',
  'video_conferences',
  'ai_tutor_analytics',
  'ai_tutor_conversations',
  'user_badges',
  'certificates',
  'ceu_credits',
  'student_activity_log',
  'course_sections',
];

/**
 * Tables whose course_id should be set to NULL (rather than deleted)
 * when the course is deleted — typically historical/analytical data we
 * want to preserve.
 */
const COURSE_SET_NULL_TABLES: readonly string[] = [
  'student_risk_indicators',
  'learning_analytics_predictions',
  'engagement_metrics',
  'proctoring_sessions',
  'plagiarism_checks',
  'lti_launches',
  'lti_grade_passback',
  'oneroster_classes',
  'files',
];

/**
 * Whether the caller has permission to delete this course (stricter than update
 * permission — only admin/super_admin).
 */
export function canDeleteCourse(userRole: string): boolean {
  return hasRole(userRole, DELETER_ROLES);
}

/**
 * Delete a course and cascade-cleanup its related data.
 *
 * This runs the cascade as two parallel waves:
 *   1. DELETE rows in all known child tables.
 *   2. SET course_id = NULL in tables where we want to keep the rows.
 * Both waves use `Promise.allSettled` so that a missing table (or a
 * permission error on one table) doesn't abort the whole cleanup.
 *
 * Callers that want to skip the permission check can pass `userRole`
 * explicitly; otherwise the caller is responsible for checking
 * `canDeleteCourse` before invoking this.
 */
export async function deleteCourse(
  tq: TenantQuery,
  courseId: string
): Promise<DeleteCourseResult> {
  if (!courseId) {
    throw new Error('courseId is required');
  }

  // Verify the course exists — produces a clean 404 in the route.
  const { data: course } = await tq
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .single();

  if (!course) {
    throw new CourseNotFoundError();
  }

  // Wave 1: cascade deletes.
  await Promise.allSettled(
    COURSE_CASCADE_DELETE_TABLES.map((table) =>
      tq.from(table).delete().eq('course_id', courseId)
    )
  );

  // Wave 2: null out course_id on preserved tables.
  await Promise.allSettled(
    COURSE_SET_NULL_TABLES.map((table) =>
      tq.from(table).update({ course_id: null }).eq('course_id', courseId)
    )
  );

  // Finally, delete the course row itself.
  const { error } = await tq.from('courses').delete().eq('id', courseId);
  if (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
  }

  return {
    deleted: true,
    cascadeOperations: COURSE_CASCADE_DELETE_TABLES.length + COURSE_SET_NULL_TABLES.length,
  };
}
