import { describe, it, expect, vi } from 'vitest'
import { NextResponse } from 'next/server'

// Mock authenticateUser directly
vi.mock('../api-auth', () => ({
  authenticateUser: vi.fn(() => Promise.resolve({
    success: true,
    user: { id: 'user-1', email: 'test@test.com' },
    userProfile: { id: 'user-1', email: 'test@test.com', name: 'Test User', role: 'student', created_at: '', updated_at: '' },
  })),
  createAuthResponse: vi.fn((error: string, status: number) =>
    NextResponse.json({ error }, { status })
  ),
  UserProfile: {},
}))

// Mock tenant-query
vi.mock('../tenant-query', () => ({
  getTenantIdFromRequest: vi.fn(() => 'tenant-1'),
  createTenantQuery: vi.fn((tenantId: string) => ({
    from: vi.fn(() => ({ select: vi.fn() })),
    raw: {},
    tenantId,
  })),
}))

import { withTenantAuth, type TenantAuthContext } from '../with-tenant-auth'
import { authenticateUser } from '../api-auth'

function createMockRequest(): any {
  return {
    headers: { get: (name: string) => name === 'x-tenant-id' ? 'tenant-1' : null },
    url: 'http://localhost:3000/api/test',
    method: 'GET',
    nextUrl: { pathname: '/api/test' },
  }
}

describe('withTenantAuth', () => {
  it('provides user, tq, and tenantId to the handler', async () => {
    let captured: TenantAuthContext | null = null;

    const handler = withTenantAuth(async (ctx) => {
      captured = ctx;
      return NextResponse.json({ ok: true });
    });

    await handler(createMockRequest());

    expect(captured).not.toBeNull();
    expect(captured!.user.id).toBe('user-1');
    expect(captured!.user.role).toBe('student');
    expect(captured!.tenantId).toBe('tenant-1');
    expect(typeof captured!.tq.from).toBe('function');
  })

  it('rejects when required role is not met', async () => {
    const handler = withTenantAuth(
      async () => NextResponse.json({ ok: true }),
      { requiredRoles: ['admin', 'super_admin'] as const }
    );

    const response = await handler(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  })

  it('returns 401 when authentication fails', async () => {
    vi.mocked(authenticateUser).mockResolvedValueOnce({
      success: false,
      error: 'Authentication required',
      status: 401,
    });

    const handler = withTenantAuth(async () => NextResponse.json({ ok: true }));
    const response = await handler(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  })

  it('catches handler errors and returns 500', async () => {
    const handler = withTenantAuth(async () => {
      throw new Error('DB connection failed');
    });

    const response = await handler(createMockRequest());
    expect(response.status).toBe(500);
  })
})
