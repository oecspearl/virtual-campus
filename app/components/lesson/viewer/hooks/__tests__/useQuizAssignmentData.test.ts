// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useQuizAssignmentData,
  type QuizAssignmentContentItem,
} from '../useQuizAssignmentData';

// ─── Fetch harness ─────────────────────────────────────────────────────────

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function installFetch(handler: FetchHandler) {
  (global as { fetch: typeof fetch }).fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      return handler(url, init);
    }
  ) as unknown as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── Happy path ────────────────────────────────────────────────────────────

describe('useQuizAssignmentData — happy path', () => {
  it('fetches quiz records for every quiz content item', async () => {
    installFetch((url) => {
      const match = url.match(/\/api\/quizzes\/(.+)$/);
      if (match) return jsonResponse(200, { id: match[1], title: `Quiz ${match[1]}` });
      return jsonResponse(404, {});
    });

    const content: QuizAssignmentContentItem[] = [
      { type: 'quiz', data: { quizId: 'q-1' } },
      { type: 'quiz', data: { quizId: 'q-2' } },
      { type: 'text' }, // not a quiz — should be skipped
    ];

    const { result } = renderHook(() => useQuizAssignmentData(content));

    await waitFor(() => {
      expect(result.current.quizData['q-1']).toMatchObject({ id: 'q-1' });
      expect(result.current.quizData['q-2']).toMatchObject({ id: 'q-2' });
    });
  });

  it('fetches assignment records for every assignment content item', async () => {
    installFetch((url) => {
      const match = url.match(/\/api\/assignments\/(.+)$/);
      if (match) return jsonResponse(200, { id: match[1], title: `Asg ${match[1]}` });
      return jsonResponse(404, {});
    });

    const content: QuizAssignmentContentItem[] = [
      { type: 'assignment', data: { assignmentId: 'a-1' } },
    ];

    const { result } = renderHook(() => useQuizAssignmentData(content));

    await waitFor(() => {
      expect(result.current.assignmentData['a-1']).toMatchObject({ id: 'a-1' });
    });
  });
});

// ─── Not found ─────────────────────────────────────────────────────────────

describe('useQuizAssignmentData — not found handling', () => {
  it('tracks 404 quiz responses in notFoundQuizzes', async () => {
    installFetch(() => jsonResponse(404, {}));

    const content: QuizAssignmentContentItem[] = [
      { type: 'quiz', data: { quizId: 'missing' } },
    ];

    const { result } = renderHook(() => useQuizAssignmentData(content));

    await waitFor(() => {
      expect(result.current.notFoundQuizzes.has('missing')).toBe(true);
    });
    expect(result.current.quizData['missing']).toBeUndefined();
  });

  it('tracks 404 assignment responses in notFoundAssignments', async () => {
    installFetch(() => jsonResponse(404, {}));

    const content: QuizAssignmentContentItem[] = [
      { type: 'assignment', data: { assignmentId: 'gone' } },
    ];

    const { result } = renderHook(() => useQuizAssignmentData(content));

    await waitFor(() => {
      expect(result.current.notFoundAssignments.has('gone')).toBe(true);
    });
  });

  it('does not retry fetching IDs already marked as not found', async () => {
    const spy = vi.fn(async () => jsonResponse(404, {}));
    (global as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;

    const content: QuizAssignmentContentItem[] = [
      { type: 'quiz', data: { quizId: 'missing' } },
    ];

    const { rerender, result } = renderHook((c) => useQuizAssignmentData(c), {
      initialProps: content,
    });

    await waitFor(() => {
      expect(result.current.notFoundQuizzes.has('missing')).toBe(true);
    });

    // Trigger a re-render with the same content — should NOT refetch.
    const callCountBefore = spy.mock.calls.length;
    rerender(content);
    rerender(content);
    expect(spy.mock.calls.length).toBe(callCountBefore);
  });
});

// ─── Deduplication ────────────────────────────────────────────────────────

describe('useQuizAssignmentData — deduplication', () => {
  it('does not refetch an already-loaded quiz', async () => {
    const fetches: string[] = [];
    installFetch((url) => {
      fetches.push(url);
      const match = url.match(/\/api\/quizzes\/(.+)$/);
      if (match) return jsonResponse(200, { id: match[1] });
      return jsonResponse(404, {});
    });

    const content: QuizAssignmentContentItem[] = [
      { type: 'quiz', data: { quizId: 'q-1' } },
    ];

    const { result, rerender } = renderHook((c) => useQuizAssignmentData(c), {
      initialProps: content,
    });

    await waitFor(() => {
      expect(result.current.quizData['q-1']).toBeDefined();
    });

    const before = fetches.length;
    // Re-render with a new array reference but the same logical content.
    rerender([{ type: 'quiz', data: { quizId: 'q-1' } }]);

    // Give the effect a tick to run (it would have fetched if not deduped).
    await new Promise((r) => setTimeout(r, 10));
    expect(fetches.length).toBe(before);
  });
});

// ─── Error tolerance ───────────────────────────────────────────────────────

describe('useQuizAssignmentData — error handling', () => {
  it('does not crash when a fetch throws (e.g. offline)', async () => {
    installFetch(() => Promise.reject(new Error('network down')));

    const content: QuizAssignmentContentItem[] = [
      { type: 'quiz', data: { quizId: 'q-err' } },
    ];

    const { result } = renderHook(() => useQuizAssignmentData(content));

    // The failed fetch resolves; loading should clear.
    await waitFor(() => {
      expect(result.current.loadingData.has('q-err')).toBe(false);
    });
    expect(result.current.quizData['q-err']).toBeUndefined();
    expect(result.current.notFoundQuizzes.has('q-err')).toBe(false);
  });
});
