/**
 * Course service — read/update/delete for the `courses` table and its
 * related data.
 *
 * Cascade cleanup for deletes lives in the database: every FK that points
 * at `courses` (directly or transitively) is declared with `ON DELETE
 * CASCADE` or `ON DELETE SET NULL` — see migration
 * `database/consolidated/036-course-delete-cascade.sql`. The delete
 * function here is therefore a single-row delete; new child tables added
 * in the future just need an FK with the right ON DELETE action and they
 * will participate automatically.
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

// ─── Delete ─────────────────────────────────────────────────────────────────

/**
 * Whether the caller has permission to delete this course (stricter than update
 * permission — only admin/super_admin).
 */
export function canDeleteCourse(userRole: string): boolean {
  return hasRole(userRole, DELETER_ROLES);
}

/**
 * Delete a course. The DB handles all child cleanup via ON DELETE CASCADE /
 * ON DELETE SET NULL (see migration 036-course-delete-cascade.sql), so this
 * is a single-row delete — no cascade list to maintain here.
 *
 * Callers are responsible for checking `canDeleteCourse` first.
 */
export async function deleteCourse(
  tq: TenantQuery,
  courseId: string
): Promise<DeleteCourseResult> {
  if (!courseId) {
    throw new Error('courseId is required');
  }

  const { data: deleted, error } = await tq
    .from('courses')
    .delete()
    .eq('id', courseId)
    .select('id')
    .maybeSingle();

  if (error) {
    // PGRST116 from PostgREST = "no rows" — for a DELETE that means the
    // course wasn't there to begin with, so map it to CourseNotFoundError
    // instead of a generic 500.
    if ((error as { code?: string }).code === 'PGRST116') {
      throw new CourseNotFoundError();
    }
    throw new Error(`Failed to delete course: ${error.message}`);
  }
  if (!deleted) {
    throw new CourseNotFoundError();
  }

  return { deleted: true };
}
