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

// ─── deleteCourse (cascade) ────────────────────────────────────────────────

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

  it('cascades deletes across child tables before deleting the course', async () => {
    const { tq, calls } = makeTenantQueryMock({
      courses: {
        select: { data: { id: 'c-1' }, error: null },
      },
    });

    const result = await deleteCourse(tq, 'c-1');

    // Should have attempted ~28 child-table deletes + ~9 null-outs + the
    // final course delete.
    const childDeletes = calls.filter((c) => c.method === 'delete' && c.table !== 'courses');
    expect(childDeletes.length).toBeGreaterThanOrEqual(25);

    const nullOuts = calls.filter(
      (c) =>
        c.method === 'update' &&
        c.table !== 'courses' &&
        typeof c.args[0] === 'object' &&
        c.args[0] !== null &&
        (c.args[0] as Record<string, unknown>).course_id === null
    );
    expect(nullOuts.length).toBeGreaterThanOrEqual(5);

    // Final delete on the courses table itself
    expect(findCall(calls, 'courses', 'delete')).toBeDefined();

    expect(result.deleted).toBe(true);
    expect(result.cascadeOperations).toBeGreaterThanOrEqual(30);
  });

  it('deletes key child tables (quizzes, enrollments, lessons)', async () => {
    const { tq, calls } = makeTenantQueryMock({
      courses: { select: { data: { id: 'c-1' }, error: null } },
    });

    await deleteCourse(tq, 'c-1');

    expect(findCall(calls, 'quizzes', 'delete')).toBeDefined();
    expect(findCall(calls, 'enrollments', 'delete')).toBeDefined();
    expect(findCall(calls, 'lessons', 'delete')).toBeDefined();
    expect(findCall(calls, 'assignments', 'delete')).toBeDefined();
  });

  it('nulls out course_id on preservation tables (files, analytics)', async () => {
    const { tq, calls } = makeTenantQueryMock({
      courses: { select: { data: { id: 'c-1' }, error: null } },
    });

    await deleteCourse(tq, 'c-1');

    const filesCall = findCall(calls, 'files', 'update');
    expect(filesCall).toBeDefined();
    expect((filesCall?.args[0] as Record<string, unknown>).course_id).toBeNull();

    expect(findCall(calls, 'learning_analytics_predictions', 'update')).toBeDefined();
  });
});
