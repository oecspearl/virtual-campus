import { describe, it, expect } from 'vitest';
import { syncAssessmentToGradebook } from '../gradebook-service';
import { makeTenantQueryMock, findCall } from './test-helpers';

describe('syncAssessmentToGradebook — validation', () => {
  it('throws when courseId is missing', async () => {
    const { tq } = makeTenantQueryMock();
    await expect(
      syncAssessmentToGradebook(tq, {
        courseId: '',
        assessmentId: 'a-1',
        type: 'quiz',
        title: 't',
        points: 10,
      })
    ).rejects.toThrow(/required/);
  });

  it('throws when assessmentId is missing', async () => {
    const { tq } = makeTenantQueryMock();
    await expect(
      syncAssessmentToGradebook(tq, {
        courseId: 'c-1',
        assessmentId: '',
        type: 'quiz',
        title: 't',
        points: 10,
      })
    ).rejects.toThrow(/required/);
  });

  it('throws when points is zero or negative', async () => {
    const { tq } = makeTenantQueryMock();
    await expect(
      syncAssessmentToGradebook(tq, {
        courseId: 'c-1',
        assessmentId: 'a-1',
        type: 'quiz',
        title: 't',
        points: 0,
      })
    ).rejects.toThrow(/positive/);

    await expect(
      syncAssessmentToGradebook(tq, {
        courseId: 'c-1',
        assessmentId: 'a-1',
        type: 'quiz',
        title: 't',
        points: -5,
      })
    ).rejects.toThrow(/positive/);
  });

  it('throws when points is NaN', async () => {
    const { tq } = makeTenantQueryMock();
    await expect(
      syncAssessmentToGradebook(tq, {
        courseId: 'c-1',
        assessmentId: 'a-1',
        type: 'quiz',
        title: 't',
        points: Number.NaN,
      })
    ).rejects.toThrow(/positive/);
  });
});

describe('syncAssessmentToGradebook — idempotency', () => {
  it('skips insert when a grade item already exists for this assessment', async () => {
    const { tq, calls } = makeTenantQueryMock({
      course_grade_items: { select: { data: { id: 'existing-id' }, error: null } },
    });

    const result = await syncAssessmentToGradebook(tq, {
      courseId: 'c-1',
      assessmentId: 'a-1',
      type: 'quiz',
      title: 't',
      points: 10,
    });

    expect(result).toEqual({ synced: false, alreadyExists: true });
    expect(findCall(calls, 'course_grade_items', 'insert')).toBeUndefined();
  });
});

describe('syncAssessmentToGradebook — quiz inserts', () => {
  it('creates a grade item with the right payload for quiz type', async () => {
    const { tq, calls } = makeTenantQueryMock({
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: null },
      },
    });

    const result = await syncAssessmentToGradebook(tq, {
      courseId: 'c-1',
      assessmentId: 'q-1',
      type: 'quiz',
      title: 'Midterm',
      dueDate: '2026-05-01',
      points: 75,
    });

    expect(result).toEqual({ synced: true, alreadyExists: false });

    const insertCall = findCall(calls, 'course_grade_items', 'insert');
    const payload = (insertCall?.args[0] as any[])[0];
    expect(payload).toMatchObject({
      course_id: 'c-1',
      title: 'Midterm',
      type: 'quiz',
      category: 'Quizzes',
      points: 75,
      assessment_id: 'q-1',
      due_date: '2026-05-01',
      weight: 1.0,
      is_active: true,
    });
  });
});

describe('syncAssessmentToGradebook — assignment inserts', () => {
  it('uses the "Assignments" category by default for assignment type', async () => {
    const { tq, calls } = makeTenantQueryMock({
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: null },
      },
    });

    await syncAssessmentToGradebook(tq, {
      courseId: 'c-1',
      assessmentId: 'a-1',
      type: 'assignment',
      title: 'Essay',
      points: 100,
    });

    const payload = (findCall(calls, 'course_grade_items', 'insert')?.args[0] as any[])[0];
    expect(payload.category).toBe('Assignments');
    expect(payload.type).toBe('assignment');
  });

  it('respects a custom category override', async () => {
    const { tq, calls } = makeTenantQueryMock({
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: null },
      },
    });

    await syncAssessmentToGradebook(tq, {
      courseId: 'c-1',
      assessmentId: 'a-1',
      type: 'assignment',
      title: 'Final Paper',
      points: 100,
      category: 'Papers',
    });

    const payload = (findCall(calls, 'course_grade_items', 'insert')?.args[0] as any[])[0];
    expect(payload.category).toBe('Papers');
  });

  it('respects a custom weight', async () => {
    const { tq, calls } = makeTenantQueryMock({
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: null },
      },
    });

    await syncAssessmentToGradebook(tq, {
      courseId: 'c-1',
      assessmentId: 'a-1',
      type: 'assignment',
      title: 'x',
      points: 100,
      weight: 2.5,
    });

    const payload = (findCall(calls, 'course_grade_items', 'insert')?.args[0] as any[])[0];
    expect(payload.weight).toBe(2.5);
  });
});

describe('syncAssessmentToGradebook — DB errors', () => {
  it('throws when the insert fails', async () => {
    const { tq } = makeTenantQueryMock({
      course_grade_items: {
        select: { data: null, error: { code: 'PGRST116' } },
        insert: { data: null, error: { message: 'permission denied' } },
      },
    });

    await expect(
      syncAssessmentToGradebook(tq, {
        courseId: 'c-1',
        assessmentId: 'a-1',
        type: 'quiz',
        title: 't',
        points: 10,
      })
    ).rejects.toThrow(/permission denied/);
  });
});
