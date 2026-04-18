// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useUserRole } from '../useUserRole';

// We swap useSupabase for a mutable stub so each test can shape the
// session + user metadata before rendering.
let currentUser: { user_metadata?: { role?: string } } | null = null;
let sessionToken: string | null = null;

vi.mock('@/lib/supabase-provider', () => ({
  useSupabase: () => ({
    user: currentUser,
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: sessionToken ? { access_token: sessionToken } : null },
        }),
      },
    },
  }),
}));

function Harness() {
  const { role, isInstructor } = useUserRole();
  return (
    <div>
      <div data-testid="role">{role ?? ''}</div>
      <div data-testid="is-instructor">{String(isInstructor)}</div>
    </div>
  );
}

describe('useUserRole', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    currentUser = null;
    sessionToken = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns null role when there is no user', () => {
    render(<Harness />);
    expect(screen.getByTestId('role').textContent).toBe('');
    expect(screen.getByTestId('is-instructor').textContent).toBe('false');
  });

  it('uses /api/auth/profile when a session token is available', async () => {
    currentUser = { user_metadata: {} };
    sessionToken = 'tok';
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'instructor' }),
    });
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('role').textContent).toBe('instructor')
    );
    expect(screen.getByTestId('is-instructor').textContent).toBe('true');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('/api/auth/profile');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('falls back to user_metadata.role when the profile call fails', async () => {
    currentUser = { user_metadata: { role: 'student' } };
    sessionToken = 'tok';
    (global.fetch as any).mockResolvedValue({ ok: false });
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('role').textContent).toBe('student')
    );
    expect(screen.getByTestId('is-instructor').textContent).toBe('false');
  });

  it('falls back to "student" when there is no session and no metadata role', async () => {
    currentUser = { user_metadata: {} };
    sessionToken = null;
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('role').textContent).toBe('student')
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('marks admin, instructor, curriculum_designer, super_admin as instructors', async () => {
    for (const role of ['admin', 'instructor', 'curriculum_designer', 'super_admin']) {
      currentUser = { user_metadata: { role } };
      sessionToken = null;
      const { unmount } = render(<Harness />);
      await waitFor(() =>
        expect(screen.getByTestId('role').textContent).toBe(role)
      );
      expect(screen.getByTestId('is-instructor').textContent).toBe('true');
      unmount();
    }
  });

  it('does not mark student or parent as instructor', async () => {
    for (const role of ['student', 'parent']) {
      currentUser = { user_metadata: { role } };
      sessionToken = null;
      const { unmount } = render(<Harness />);
      await waitFor(() =>
        expect(screen.getByTestId('role').textContent).toBe(role)
      );
      expect(screen.getByTestId('is-instructor').textContent).toBe('false');
      unmount();
    }
  });
});
