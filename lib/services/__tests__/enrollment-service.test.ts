import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStudentEnrollments, listAllEnrollments } from '../enrollment-service';

// Build a chainable mock that records the entire query chain
function makeTq(finalResult: { data: unknown[] | null; error: { message: string } | null }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'limit'];

  for (const m of methods) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return chain;
    });
  }

  // Make the chain thenable so `await chain` resolves to the final result
  chain.then = (onFulfilled: (v: typeof finalResult) => unknown) => Promise.resolve(onFulfilled(finalResult));

  const tq: any = {
    raw: {
      from: vi.fn((table: string) => {
        calls.push({ method: 'from', args: [table] });
        return chain;
      }),
    },
    tenantId: 'tenant-1',
  };

  return { tq, calls };
}

describe('listStudentEnrollments', () => {
  it('filters by student_id and active status, newest first', async () => {
    const { tq, calls } = makeTq({ data: [{ id: 'e-1' }], error: null });

    const result = await listStudentEnrollments(tq, 'student-abc');

    expect(result.enrollments).toEqual([{ id: 'e-1' }]);
    expect(calls.some((c) => c.method === 'from' && c.args[0] === 'enrollments')).toBe(true);
    expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'student_id' && c.args[1] === 'student-abc')).toBe(true);
    expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'status' && c.args[1] === 'active')).toBe(true);
    expect(calls.some((c) => c.method === 'order' && c.args[0] === 'enrolled_at')).toBe(true);
  });

  it('returns empty array when no enrollments exist', async () => {
    const { tq } = makeTq({ data: null, error: null });
    const result = await listStudentEnrollments(tq, 'student-abc');
    expect(result.enrollments).toEqual([]);
  });

  it('throws when the DB query fails', async () => {
    const { tq } = makeTq({ data: null, error: { message: 'connection refused' } });
    await expect(listStudentEnrollments(tq, 'student-abc')).rejects.toThrow(/connection refused/);
  });
});

describe('listAllEnrollments', () => {
  it('defaults to limit 200', async () => {
    const { tq, calls } = makeTq({ data: [], error: null });

    await listAllEnrollments(tq);

    expect(calls.some((c) => c.method === 'limit' && c.args[0] === 200)).toBe(true);
  });

  it('respects a custom limit', async () => {
    const { tq, calls } = makeTq({ data: [], error: null });

    await listAllEnrollments(tq, { limit: 50 });

    expect(calls.some((c) => c.method === 'limit' && c.args[0] === 50)).toBe(true);
  });

  it('orders by enrolled_at descending', async () => {
    const { tq, calls } = makeTq({ data: [], error: null });
    await listAllEnrollments(tq);

    const orderCall = calls.find((c) => c.method === 'order');
    expect(orderCall?.args[0]).toBe('enrolled_at');
    expect((orderCall?.args[1] as any)?.ascending).toBe(false);
  });

  it('throws with a descriptive message on failure', async () => {
    const { tq } = makeTq({ data: null, error: { message: 'permission denied' } });
    await expect(listAllEnrollments(tq)).rejects.toThrow(/permission denied/);
  });
});
