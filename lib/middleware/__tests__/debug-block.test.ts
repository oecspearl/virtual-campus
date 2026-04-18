import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { blockDebugInProduction } from '../debug-block';

function mockRequest(pathname: string) {
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
  } as any;
}

describe('blockDebugInProduction', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalEnv || 'test');
  });

  it('blocks /api/debug routes in production with 404 JSON', async () => {
    const res = blockDebugInProduction(mockRequest('/api/debug/check'), new Headers(), '/api/debug/check');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(404);
    const body = await res!.json();
    expect(body.error).toBe('Not found');
  });

  it('rewrites test-* paths to /not-found in production', () => {
    const res = blockDebugInProduction(mockRequest('/test-quiz'), new Headers(), '/test-quiz');
    expect(res).not.toBeNull();
    expect(res!.headers.get('x-middleware-rewrite')).toContain('/not-found');
  });

  it('rewrites /auth-test to /not-found in production', () => {
    const res = blockDebugInProduction(mockRequest('/auth-test'), new Headers(), '/auth-test');
    expect(res).not.toBeNull();
  });

  it('rewrites /admin/test to /not-found in production', () => {
    const res = blockDebugInProduction(mockRequest('/admin/test'), new Headers(), '/admin/test');
    expect(res).not.toBeNull();
  });

  it('allows non-debug paths through', () => {
    expect(blockDebugInProduction(mockRequest('/courses'), new Headers(), '/courses')).toBeNull();
    expect(blockDebugInProduction(mockRequest('/api/courses'), new Headers(), '/api/courses')).toBeNull();
    expect(blockDebugInProduction(mockRequest('/dashboard'), new Headers(), '/dashboard')).toBeNull();
  });

  it('does NOT block debug routes in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(blockDebugInProduction(mockRequest('/api/debug/x'), new Headers(), '/api/debug/x')).toBeNull();
    expect(blockDebugInProduction(mockRequest('/test-quiz'), new Headers(), '/test-quiz')).toBeNull();
  });
});
