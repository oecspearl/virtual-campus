import { describe, it, expect } from 'vitest';
import { createAssignmentWithSideEffects } from '../assignment-service';
import { makeTenantQueryMock, findCall } from './test-helpers';

describe('createAssignmentWithSideEffects — insert', () => {
  it('inserts an assignment with the supplied fields', async () => {
    const { tq, calls } = makeTenantQueryMock({
      assignments: {
        insert: {
          data: { id: 'a-1', lesson_id: null, title: 'Essay', course_id: 'c-1', points: 100 },
          error: null,
        },
      },
    });

    const result = await createAssignmentWithSideEffects(
      tq,
      { course_id: 'c-1', title: 'Essay', points: 50 },
      'user-1'
    );

    expect(result.id).toBe('a-1');
    const insertCall = findCall(calls, 'assignments', 'insert');
    const payload = (insertCall?.args[0] as any[])[0];
    expect(payload).toMatchObject({
      course_id: 'c-1',
      title: 'Essay',
      points: 50,
      creator_id: 'user-1',
    });
  });

  it('throws when the insert fails', async () => {
    const { tq } = makeTenantQueryMock({
      assignments: { insert: { data: null, error: { message: 'constraint violation' } } },
    });

    await expect(
      createAssignmentWithSideEffects(tq, { course_id: 'c-1' }, 'user-1')
    ).rejects.toThrow(/constraint violation/);
  });

  it('applies sensible defaults when fields are not provided', async () => {
    const { tq, calls } = makeTenantQueryMock({
      assignments: {
        insert: { data: { id: 'a-1', lesson_id: null, title: 'Untitled Assignment' }, error: null },
      },
    });

    await createAssignmentWithSideEffects(tq, { course_id: 'c-1' }, 'user-1');

    const payload = (findCall(calls, 'assignments', 'insert')?.args[0] as any[])[0];
    expect(payload.title).toBe('Untitled Assignment');
    expect(payload.points).toBe(100);
    expect(payload.submission_types).toEqual(['file']);
    expect(payload.allow_late_submissions).toBe(true);
    expect(payload.published).toBe(false);
  });

  it('derives course_id from lesson when only lesson_id is given', async () => {
    const { tq, calls } = makeTenantQueryMock({
      lessons: { select: { data: { course_id: 'c-from-lesson' }, error: null } },
      assignments: {
        insert: {
          data: { id: 'a-1', lesson_id: 'l-1', title: 't', course_id: 'c-from-lesson', points: 100 },
          error: null,
        },
      },
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: null },
      },
    });

    await createAssignmentWithSideEffects(tq, { lesson_id: 'l-1' }, 'user-1');

    const payload = (findCall(calls, 'assignments', 'insert')?.args[0] as any[])[0];
    expect(payload.course_id).toBe('c-from-lesson');
  });
});

describe('createAssignmentWithSideEffects — gradebook sync (parity with quiz)', () => {
  it('creates a gradebook item when the assignment is attached to a lesson', async () => {
    const { tq, calls } = makeTenantQueryMock({
      lessons: { select: { data: { course_id: 'c-1' }, error: null } },
      assignments: {
        insert: {
          data: { id: 'a-1', lesson_id: 'l-1', title: 'Essay', course_id: 'c-1', points: 75 },
          error: null,
        },
      },
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: null },
      },
    });

    const result = await createAssignmentWithSideEffects(
      tq,
      { lesson_id: 'l-1', title: 'Essay', points: 75 },
      'user-1'
    );

    expect(result.gradebookSynced).toBe(true);

    const gradeInsert = findCall(calls, 'course_grade_items', 'insert');
    const payload = (gradeInsert?.args[0] as any[])[0];
    expect(payload).toMatchObject({
      course_id: 'c-1',
      assessment_id: 'a-1',
      type: 'assignment',
      category: 'Assignments',
      points: 75,
    });
  });

  it('uses default 100 points when the assignment has no points or zero points', async () => {
    const { tq, calls } = makeTenantQueryMock({
      lessons: { select: { data: { course_id: 'c-1' }, error: null } },
      assignments: {
        insert: {
          data: { id: 'a-1', lesson_id: 'l-1', title: 'x', course_id: 'c-1', points: 0 },
          error: null,
        },
      },
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: null },
      },
    });

    await createAssignmentWithSideEffects(tq, { lesson_id: 'l-1', points: 0 }, 'user-1');

    const payload = (findCall(calls, 'course_grade_items', 'insert')?.args[0] as any[])[0];
    expect(payload.points).toBe(100);
  });

  it('skips gradebook sync when assignment has no lesson_id', async () => {
    const { tq, calls } = makeTenantQueryMock({
      assignments: {
        insert: {
          data: { id: 'a-1', lesson_id: null, title: 't', course_id: 'c-1', points: 100 },
          error: null,
        },
      },
    });

    const result = await createAssignmentWithSideEffects(
      tq,
      { course_id: 'c-1', title: 't' },
      'user-1'
    );

    expect(result.gradebookSynced).toBe(false);
    expect(findCall(calls, 'course_grade_items', 'insert')).toBeUndefined();
  });
});

describe('createAssignmentWithSideEffects — side-effect isolation', () => {
  it('does not fail the assignment creation when gradebook sync throws', async () => {
    const { tq } = makeTenantQueryMock({
      lessons: { select: { data: { course_id: 'c-1' }, error: null } },
      assignments: {
        insert: {
          data: { id: 'a-1', lesson_id: 'l-1', title: 't', course_id: 'c-1', points: 100 },
          error: null,
        },
      },
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: { message: 'boom' } },
      },
    });

    const result = await createAssignmentWithSideEffects(
      tq,
      { lesson_id: 'l-1' },
      'user-1'
    );

    expect(result.id).toBe('a-1');
    expect(result.gradebookSynced).toBe(false);
  });
});
