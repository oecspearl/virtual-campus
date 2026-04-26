import { describe, it, expect } from 'vitest';
import {
  getCourse,
  updateCourse,
  deleteCourse,
  canMutateCourse,
  canDeleteCourse,
  CourseNotFoundError,
  CoursePermissionError,
} from '../course-service';
import { makeTenantQueryMock, findCall } from './test-helpers';

// ─── Permission helpers ────────────────────────────────────────────────────

describe('canDeleteCourse', () => {
  it('allows admin and super_admin only', () => {
    expect(canDeleteCourse('admin')).toBe(true);
    expect(canDeleteCourse('super_admin')).toBe(true);
  });

  it('denies everyone else', () => {
    expect(canDeleteCourse('curriculum_designer')).toBe(false);
    expect(canDeleteCourse('instructor')).toBe(false);
    expect(canDeleteCourse('student')).toBe(false);
    expect(canDeleteCourse('')).toBe(false);
  });
});

describe('canMutateCourse', () => {
  it('allows admin / super_admin / curriculum_designer without DB check', async () => {
    const { tq, calls } = makeTenantQueryMock();
    expect(await canMutateCourse(tq, 'c-1', 'user-1', 'admin')).toBe(true);
    expect(await canMutateCourse(tq, 'c-1', 'user-1', 'super_admin')).toBe(true);
    expect(await canMutateCourse(tq, 'c-1', 'user-1', 'curriculum_designer')).toBe(true);
    // Should not have hit course_instructors table
    expect(findCall(calls, 'course_instructors', 'select')).toBeUndefined();
  });

  it('allows instructors listed on the course', async () => {
    const { tq } = makeTenantQueryMock({
      course_instructors: { select: { data: { id: 'ci-1' }, error: null } },
    });
    expect(await canMutateCourse(tq, 'c-1', 'user-1', 'instructor')).toBe(true);
  });

  it('denies instructors not listed on the course', async () => {
    const { tq } = makeTenantQueryMock({
      course_instructors: { select: { data: null, error: { code: 'PGRST116' } } },
    });
    expect(await canMutateCourse(tq, 'c-1', 'user-1', 'instructor')).toBe(false);
  });

  it('denies students outright', async () => {
    const { tq } = makeTenantQueryMock({
      course_instructors: { select: { data: null, error: { code: 'PGRST116' } } },
    });
    expect(await canMutateCourse(tq, 'c-1', 'user-1', 'student')).toBe(false);
  });
});

// ─── getCourse ─────────────────────────────────────────────────────────────

describe('getCourse', () => {
  it('returns the course row when found', async () => {
    const { tq } = makeTenantQueryMock({
      courses: { select: { data: { id: 'c-1', title: 'Biology' }, error: null } },
    });

    const course = await getCourse(tq, 'c-1');
    expect(course.id).toBe('c-1');
    expect(course.title).toBe('Biology');
  });

  it('throws CourseNotFoundError when the course is missing', async () => {
    const { tq } = makeTenantQueryMock({
      courses: { select: { data: null, error: { code: 'PGRST116' } } },
    });

    await expect(getCourse(tq, 'c-missing')).rejects.toBeInstanceOf(CourseNotFoundError);
  });
});

// ─── updateCourse ──────────────────────────────────────────────────────────

describe('updateCourse', () => {
  it('throws CourseNotFoundError when the course does not exist', async () => {
    const { tq } = makeTenantQueryMock({
      courses: { select: { data: null, error: { code: 'PGRST116' } } },
    });

    await expect(
      updateCourse(tq, 'c-missing', { title: 'x' }, { userId: 'u-1', userRole: 'admin' })
    ).rejects.toBeInstanceOf(CourseNotFoundError);
  });

  it('throws CoursePermissionError for unauthorized callers', async () => {
    const { tq } = makeTenantQueryMock({
      courses: { select: { data: { id: 'c-1' }, error: null } },
      course_instructors: { select: { data: null, error: { code: 'PGRST116' } } },
    });

    await expect(
      updateCourse(tq, 'c-1', { title: 'x' }, { userId: 'u-1', userRole: 'student' })
    ).rejects.toBeInstanceOf(CoursePermissionError);
  });

  it('updates and returns the new row for an admin', async () => {
    const { tq, calls } = makeTenantQueryMock({
      courses: {
        select: { data: { id: 'c-1' }, error: null },
        update: { data: { id: 'c-1', title: 'New Title' }, error: null },
      },
    });

    const result = await updateCourse(
      tq,
      'c-1',
      { title: 'New Title' },
      { userId: 'u-1', userRole: 'admin' }
    );

    expect(result.title).toBe('New Title');

    // Verify an updated_at timestamp was injected
    const updateCall = findCall(calls, 'courses', 'update');
    const payload = updateCall?.args[0] as Record<string, unknown>;
    expect(payload.title).toBe('New Title');
    expect(typeof payload.updated_at).toBe('string');
  });
});

// ─── deleteCourse ──────────────────────────────────────────────────────────
// Cascade across child tables now lives in migration 036-course-delete-
// cascade.sql (FK actions: ON DELETE CASCADE / SET NULL). The service only
// issues a single DELETE on `courses` and lets the database take care of
// the rest, so these tests assert the new one-shot contract.

describe('deleteCourse', () => {
  it('throws when courseId is missing', async () => {
    const { tq } = makeTenantQueryMock();
    await expect(deleteCourse(tq, '')).rejects.toThrow(/required/);
  });

  it('throws CourseNotFoundError when the course does not exist', async () => {
    const { tq } = makeTenantQueryMock({
      courses: { select: { data: null, error: { code: 'PGRST116' } } },
    });

    await expect(deleteCourse(tq, 'c-missing')).rejects.toBeInstanceOf(CourseNotFoundError);
  });

  it('throws CourseNotFoundError when the DELETE returns no row', async () => {
    // No PGRST116 error — just an empty response, which can happen if RLS
    // hides the row or if the id was already deleted concurrently.
    const { tq } = makeTenantQueryMock({
      courses: { select: { data: null, error: null } },
    });

    await expect(deleteCourse(tq, 'c-missing')).rejects.toBeInstanceOf(CourseNotFoundError);
  });

  it('issues a single DELETE on courses scoped to the id and returns deleted: true', async () => {
    const { tq, calls } = makeTenantQueryMock({
      courses: { select: { data: { id: 'c-1' }, error: null } },
    });

    const result = await deleteCourse(tq, 'c-1');

    // Exactly one delete, on the courses table.
    const deletes = calls.filter((c) => c.method === 'delete');
    expect(deletes).toHaveLength(1);
    expect(deletes[0].table).toBe('courses');

    // Scoped by id. The .eq('id', 'c-1') call records args ['id', 'c-1'].
    const idEq = calls.find((c) => c.table === 'courses' && c.method === 'eq');
    expect(idEq?.args).toEqual(['id', 'c-1']);

    // No application-level cascade calls on child tables — the DB does it.
    const childDeletes = calls.filter((c) => c.method === 'delete' && c.table !== 'courses');
    expect(childDeletes).toHaveLength(0);

    const nullOutUpdates = calls.filter(
      (c) =>
        c.method === 'update' &&
        c.table !== 'courses' &&
        typeof c.args[0] === 'object' &&
        c.args[0] !== null &&
        (c.args[0] as Record<string, unknown>).course_id === null
    );
    expect(nullOutUpdates).toHaveLength(0);

    expect(result).toEqual({ deleted: true });
  });

  it('surfaces a generic error from the DB (other than PGRST116) as a thrown Error', async () => {
    const { tq } = makeTenantQueryMock({
      courses: {
        select: { data: null, error: { code: '42501', message: 'permission denied' } },
      },
    });

    await expect(deleteCourse(tq, 'c-1')).rejects.toThrow(/Failed to delete course: permission denied/);
  });
});
