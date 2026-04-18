import { describe, it, expect, vi } from 'vitest';
import { checkCsrf } from '../csrf-check';

// Allow our tests to control whether CSRF validation passes or fails
vi.mock('@/lib/security', () => ({
  validateCSRFToken: vi.fn(() => true),
}));

import { validateCSRFToken } from '@/lib/security';

function mockRequest(method: string) {
  return { method } as any;
}

describe('checkCsrf', () => {
  it('skips non-API paths', () => {
    expect(checkCsrf(mockRequest('POST'), '/dashboard')).toBeNull();
    expect(checkCsrf(mockRequest('DELETE'), '/courses/123')).toBeNull();
  });

  it('skips GET/HEAD/OPTIONS (non-mutating) on API routes', () => {
    expect(checkCsrf(mockRequest('GET'), '/api/courses')).toBeNull();
    expect(checkCsrf(mockRequest('HEAD'), '/api/courses')).toBeNull();
    expect(checkCsrf(mockRequest('OPTIONS'), '/api/courses')).toBeNull();
  });

  it('skips /api/auth callbacks (OAuth redirects cross origins legitimately)', () => {
    expect(checkCsrf(mockRequest('POST'), '/api/auth/signin')).toBeNull();
    expect(checkCsrf(mockRequest('POST'), '/api/auth/callback/google')).toBeNull();
  });

  it('skips /api/cron routes (invoked by Vercel, not a user origin)', () => {
    expect(checkCsrf(mockRequest('POST'), '/api/cron/sonisweb-sync')).toBeNull();
  });

  it('returns 403 when CSRF validation fails on a mutating API request', async () => {
    vi.mocked(validateCSRFToken).mockReturnValueOnce(false);
    const res = checkCsrf(mockRequest('POST'), '/api/courses');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe('Invalid request origin');
  });

  it('passes through when CSRF validation succeeds', () => {
    vi.mocked(validateCSRFToken).mockReturnValueOnce(true);
    expect(checkCsrf(mockRequest('POST'), '/api/courses')).toBeNull();
    expect(checkCsrf(mockRequest('PUT'), '/api/courses/1')).toBeNull();
    expect(checkCsrf(mockRequest('PATCH'), '/api/courses/1')).toBeNull();
    expect(checkCsrf(mockRequest('DELETE'), '/api/courses/1')).toBeNull();
  });
});
