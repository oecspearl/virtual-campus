// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useContentProgress } from '../useContentProgress';

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

// ─── Initial load ──────────────────────────────────────────────────────────

describe('useContentProgress — initial load', () => {
  it('starts with null profileId and empty progress map', () => {
    installFetch(() => jsonResponse(200, null));
    const { result } = renderHook(() => useContentProgress('lesson-1'));
    expect(result.current.profileId).toBeNull();
    expect(result.current.contentProgress).toEqual({});
  });

  it('loads profileId from /api/auth/profile', async () => {
    installFetch((url) => {
      if (url.endsWith('/api/auth/profile')) return jsonResponse(200, { id: 'user-42' });
      return jsonResponse(200, []);
    });

    const { result } = renderHook(() => useContentProgress('lesson-1'));

    await waitFor(() => {
      expect(result.current.profileId).toBe('user-42');
    });
  });

  it('hydrates content progress from the API', async () => {
    installFetch((url) => {
      if (url.endsWith('/api/auth/profile')) return jsonResponse(200, { id: 'user-1' });
      if (url.includes('/api/progress/user-1/lesson-1/content')) {
        return jsonResponse(200, [
          { content_index: 0, completed: true },
          { content_index: 2, completed: true },
          { content_index: 5, completed: false },
        ]);
      }
      return jsonResponse(404, {});
    });

    const { result } = renderHook(() => useContentProgress('lesson-1'));

    await waitFor(() => {
      expect(result.current.contentProgress).toEqual({ 0: true, 2: true, 5: false });
    });
  });

  it('handles unauthenticated users (profile request fails) without crashing', async () => {
    installFetch(() => jsonResponse(401, {}));
    const { result } = renderHook(() => useContentProgress('lesson-1'));
    await waitFor(() => {
      expect(result.current.profileId).toBeNull();
    });
    expect(result.current.contentProgress).toEqual({});
  });

  it('skips the progress fetch entirely when the profile has no id', async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.endsWith('/api/auth/profile')) return jsonResponse(200, {}); // no id
      return jsonResponse(200, []);
    });
    (global as { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch;

    renderHook(() => useContentProgress('lesson-1'));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const urls = fetchSpy.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => String(u).includes('/api/progress/'))).toBe(false);
  });
});

// ─── isContentComplete ────────────────────────────────────────────────────

describe('useContentProgress — isContentComplete', () => {
  it('returns the stored completion state', async () => {
    installFetch((url) => {
      if (url.endsWith('/api/auth/profile')) return jsonResponse(200, { id: 'u1' });
      return jsonResponse(200, [{ content_index: 1, completed: true }]);
    });

    const { result } = renderHook(() => useContentProgress('lesson-1'));

    await waitFor(() => {
      expect(result.current.profileId).toBe('u1');
    });
    expect(result.current.isContentComplete(1)).toBe(true);
    expect(result.current.isContentComplete(2)).toBe(false);
  });
});

// ─── toggleContentComplete ─────────────────────────────────────────────────

describe('useContentProgress — toggleContentComplete', () => {
  it('optimistically updates state and persists via PUT', async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
    installFetch((url, init) => {
      calls.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      if (url.endsWith('/api/auth/profile')) return jsonResponse(200, { id: 'u1' });
      if (init?.method === 'PUT') return jsonResponse(200, {});
      return jsonResponse(200, []);
    });

    const { result } = renderHook(() => useContentProgress('lesson-1'));
    await waitFor(() => expect(result.current.profileId).toBe('u1'));

    await act(async () => {
      await result.current.toggleContentComplete(3, { type: 'video', title: 'Intro' });
    });

    expect(result.current.isContentComplete(3)).toBe(true);
    const putCall = calls.find((c) => c.method === 'PUT');
    expect(putCall?.url).toContain('/api/progress/u1/lesson-1/content');
    expect(putCall?.body).toMatchObject({
      content_index: 3,
      content_type: 'video',
      content_title: 'Intro',
      completed: true,
    });
  });

  it('is a no-op when profileId is not loaded yet', async () => {
    installFetch(() => jsonResponse(401, {}));
    const { result } = renderHook(() => useContentProgress('lesson-1'));

    await act(async () => {
      await result.current.toggleContentComplete(0, { type: 'text' });
    });

    expect(result.current.contentProgress).toEqual({});
  });

  it('rolls back the optimistic update when the PUT fails', async () => {
    installFetch((url, init) => {
      if (url.endsWith('/api/auth/profile')) return jsonResponse(200, { id: 'u1' });
      if (init?.method === 'PUT') return Promise.reject(new Error('network down'));
      return jsonResponse(200, [{ content_index: 0, completed: true }]);
    });

    const { result } = renderHook(() => useContentProgress('lesson-1'));
    await waitFor(() => expect(result.current.isContentComplete(0)).toBe(true));

    await act(async () => {
      await result.current.toggleContentComplete(0, { type: 'text' });
    });

    // After rollback the state is back to its original value (true).
    expect(result.current.isContentComplete(0)).toBe(true);
  });
});
