import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQuizWithSideEffects, QuizValidationError } from '../quiz-service';

/**
 * Test harness that produces a `tq` mock with configurable per-table
 * responses. Each table-method combination can be stubbed individually,
 * and every call is recorded for assertions.
 */
function makeTq(options: {
  quizInsertResult?: { data: unknown; error: unknown };
  lessonSelectResult?: { data: unknown; error: unknown };
  questionsResult?: { data: unknown; error: unknown };
  gradeItemSelectResult?: { data: unknown; error: unknown };
  gradeItemInsertResult?: { data: unknown; error: unknown };
  rpcResult?: { data: unknown; error: unknown };
  lessonContentResult?: { data: unknown; error: unknown };
} = {}) {
  const calls: Array<{ table?: string; method: string; args: unknown[] }> = [];
  let currentTable: string | null = null;
  let currentOp: 'insert' | 'select-lesson' | 'select-questions' | 'select-grade-item' | 'insert-grade-item' | 'update' | 'select-lesson-content' | null = null;

  const chain: any = {};
  const chainMethods = ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert'];

  for (const m of chainMethods) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable ?? undefined, method: m, args });

      // Track which operation we're in based on the select's context.
      if (m === 'insert' && currentTable === 'quizzes') currentOp = 'insert';
      if (m === 'insert' && currentTable === 'course_grade_items') currentOp = 'insert-grade-item';
      if (m === 'update' && currentTable === 'lessons') currentOp = 'update';
      if (m === 'select' && currentTable === 'lessons' && typeof args[0] === 'string' && args[0].includes('course_id')) {
        currentOp = 'select-lesson';
      }
      if (m === 'select' && currentTable === 'lessons' && typeof args[0] === 'string' && args[0].includes('content')) {
        currentOp = 'select-lesson-content';
      }
      if (m === 'select' && currentTable === 'questions') currentOp = 'select-questions';
      if (m === 'select' && currentTable === 'course_grade_items') currentOp = 'select-grade-item';

      return chain;
    });
  }

  chain.single = vi.fn(() => {
    calls.push({ table: currentTable ?? undefined, method: 'single', args: [] });
    switch (currentOp) {
      case 'insert': return Promise.resolve(options.quizInsertResult ?? { data: null, error: null });
      case 'select-lesson': return Promise.resolve(options.lessonSelectResult ?? { data: null, error: null });
      case 'select-lesson-content': return Promise.resolve(options.lessonContentResult ?? { data: null, error: null });
      case 'select-grade-item': return Promise.resolve(options.gradeItemSelectResult ?? { data: null, error: null });
      case 'select-questions': return Promise.resolve(options.questionsResult ?? { data: null, error: null });
      default: return Promise.resolve({ data: null, error: null });
    }
  });

  // Non-.single() terminal awaits — `.eq()` resolved as a promise
  chain.then = (onFulfilled: (v: any) => unknown) => {
    if (currentOp === 'select-questions') {
      return Promise.resolve(onFulfilled(options.questionsResult ?? { data: [], error: null }));
    }
    if (currentOp === 'insert-grade-item') {
      return Promise.resolve(onFulfilled(options.gradeItemInsertResult ?? { data: null, error: null }));
    }
    if (currentOp === 'update') {
      return Promise.resolve(onFulfilled({ data: null, error: null }));
    }
    return Promise.resolve(onFulfilled({ data: null, error: null }));
  };

  const tq: any = {
    from: vi.fn((table: string) => {
      currentTable = table;
      currentOp = null;
      return chain;
    }),
    raw: {
      from: vi.fn((table: string) => {
        currentTable = table;
        currentOp = null;
        return chain;
      }),
      rpc: vi.fn((name: string, args: unknown) => {
        calls.push({ method: 'rpc', args: [name, args] });
        return Promise.resolve(options.rpcResult ?? { data: null, error: null });
      }),
    },
    tenantId: 'tenant-1',
  };

  return { tq, calls };
}

describe('createQuizWithSideEffects — validation', () => {
  it('throws QuizValidationError when neither course_id nor resolvable lesson is provided', async () => {
    const { tq } = makeTq({});
    await expect(createQuizWithSideEffects(tq, {}, 'user-1')).rejects.toBeInstanceOf(QuizValidationError);
  });

  it('throws QuizValidationError when lesson lookup fails', async () => {
    const { tq } = makeTq({
      lessonSelectResult: { data: null, error: { message: 'not found' } },
    });
    await expect(
      createQuizWithSideEffects(tq, { lesson_id: 'l-1' }, 'user-1')
    ).rejects.toBeInstanceOf(QuizValidationError);
  });
});

describe('createQuizWithSideEffects — quiz insert', () => {
  it('uses supplied course_id directly without lesson lookup', async () => {
    const { tq, calls } = makeTq({
      quizInsertResult: { data: { id: 'q-1', lesson_id: null, title: 't', course_id: 'c-1' }, error: null },
    });

    const result = await createQuizWithSideEffects(tq, { course_id: 'c-1', title: 'My Quiz' }, 'user-1');

    expect(result.id).toBe('q-1');
    expect(result.addedToLesson).toBe(false);
    expect(result.gradebookSynced).toBe(false);

    // Should not have queried lessons to resolve course_id
    const lessonSelectCalls = calls.filter((c) => c.table === 'lessons' && c.method === 'select');
    expect(lessonSelectCalls.length).toBe(0);
  });

  it('derives course_id from lesson when only lesson_id is given', async () => {
    const { tq } = makeTq({
      lessonSelectResult: { data: { course_id: 'c-from-lesson' }, error: null },
      quizInsertResult: { data: { id: 'q-1', lesson_id: 'l-1', title: 't' }, error: null },
      // No lesson content, no grade item existing → triggers both side effects
      lessonContentResult: { data: { course_id: 'c-from-lesson', content: [] }, error: null },
      gradeItemSelectResult: { data: null, error: { code: 'PGRST116' } },
      rpcResult: { data: null, error: { code: '42883' } }, // RPC not present — fallback path
    });

    const result = await createQuizWithSideEffects(tq, { lesson_id: 'l-1' }, 'user-1');
    expect(result.id).toBe('q-1');
  });

  it('throws when the quiz insert fails', async () => {
    const { tq } = makeTq({
      quizInsertResult: { data: null, error: { message: 'constraint violation' } },
    });
    await expect(
      createQuizWithSideEffects(tq, { course_id: 'c-1' }, 'user-1')
    ).rejects.toThrow(/constraint violation/);
  });

  it('maps proctored_mode=true legacy boolean to "basic"', async () => {
    const { tq, calls } = makeTq({
      quizInsertResult: { data: { id: 'q-1', lesson_id: null, title: 't' }, error: null },
    });

    await createQuizWithSideEffects(tq, { course_id: 'c-1', proctored_mode: true }, 'user-1');

    const insertCall = calls.find((c) => c.table === 'quizzes' && c.method === 'insert');
    const payload = (insertCall?.args[0] as any[])[0];
    expect(payload.proctored_mode).toBe('basic');
  });

  it('defaults proctored_mode to "none" when not specified', async () => {
    const { tq, calls } = makeTq({
      quizInsertResult: { data: { id: 'q-1', lesson_id: null, title: 't' }, error: null },
    });

    await createQuizWithSideEffects(tq, { course_id: 'c-1' }, 'user-1');

    const insertCall = calls.find((c) => c.table === 'quizzes' && c.method === 'insert');
    const payload = (insertCall?.args[0] as any[])[0];
    expect(payload.proctored_mode).toBe('none');
    expect(payload.proctor_settings).toBeNull();
  });

  it('clears proctor_settings when proctored_mode is "none"', async () => {
    const { tq, calls } = makeTq({
      quizInsertResult: { data: { id: 'q-1', lesson_id: null, title: 't' }, error: null },
    });

    await createQuizWithSideEffects(
      tq,
      { course_id: 'c-1', proctored_mode: 'none', proctor_settings: { tab: true } as any },
      'user-1'
    );

    const insertCall = calls.find((c) => c.table === 'quizzes' && c.method === 'insert');
    const payload = (insertCall?.args[0] as any[])[0];
    expect(payload.proctor_settings).toBeNull();
  });

  it('sets creator_id from the caller', async () => {
    const { tq, calls } = makeTq({
      quizInsertResult: { data: { id: 'q-1', lesson_id: null, title: 't' }, error: null },
    });

    await createQuizWithSideEffects(tq, { course_id: 'c-1' }, 'user-42');

    const insertCall = calls.find((c) => c.table === 'quizzes' && c.method === 'insert');
    const payload = (insertCall?.args[0] as any[])[0];
    expect(payload.creator_id).toBe('user-42');
  });
});

describe('createQuizWithSideEffects — side effects', () => {
  it('skips side effects when quiz has no lesson_id', async () => {
    const { tq, calls } = makeTq({
      quizInsertResult: { data: { id: 'q-1', lesson_id: null, title: 't' }, error: null },
    });

    const result = await createQuizWithSideEffects(tq, { course_id: 'c-1' }, 'user-1');

    expect(result.addedToLesson).toBe(false);
    expect(result.gradebookSynced).toBe(false);
    // No RPC call and no gradebook lookup
    expect(calls.some((c) => c.method === 'rpc')).toBe(false);
    expect(calls.some((c) => c.table === 'course_grade_items')).toBe(false);
  });

  it('does not fail the quiz creation when side effects throw', async () => {
    const { tq } = makeTq({
      lessonSelectResult: { data: { course_id: 'c-1' }, error: null },
      quizInsertResult: { data: { id: 'q-1', lesson_id: 'l-1', title: 't' }, error: null },
      rpcResult: { data: null, error: { message: 'boom', code: 'other' } },
    });

    // Should not throw — quiz creation succeeds, side effect error is logged
    const result = await createQuizWithSideEffects(tq, { lesson_id: 'l-1' }, 'user-1');
    expect(result.id).toBe('q-1');
    expect(result.addedToLesson).toBe(false);
  });
});
