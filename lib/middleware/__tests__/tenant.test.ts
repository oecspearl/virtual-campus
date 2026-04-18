import { describe, it, expect, vi } from 'vitest';

// Control what resolveTenantFromHostname returns
vi.mock('@/lib/tenant', () => ({
  resolveTenantFromHostname: vi.fn(),
  getDefaultTenantId: vi.fn(() => 'default-tenant-id'),
}));

import { resolveTenant, handleSuspendedTenant } from '../tenant';
import { resolveTenantFromHostname } from '@/lib/tenant';

function mockRequest(host: string) {
  return {
    headers: {
      get: (name: string) => (name === 'host' ? host : null),
    },
    url: `https://${host}/any`,
  } as any;
}

describe('resolveTenant', () => {
  it('sets x-tenant-id and x-tenant-slug from resolved tenant', async () => {
    vi.mocked(resolveTenantFromHostname).mockResolvedValueOnce({
      id: 'tenant-abc',
      slug: 'oecs',
      status: 'active',
    } as any);

    const headers = new Headers();
    const result = await resolveTenant(mockRequest('oecs.example.com'), headers);

    expect(result.tenantId).toBe('tenant-abc');
    expect(result.tenantSlug).toBe('oecs');
    expect(result.tenantStatus).toBe('active');
    expect(headers.get('x-tenant-id')).toBe('tenant-abc');
    expect(headers.get('x-tenant-slug')).toBe('oecs');
  });

  it('falls back to default when hostname does not resolve', async () => {
    vi.mocked(resolveTenantFromHostname).mockResolvedValueOnce(null);

    const headers = new Headers();
    const result = await resolveTenant(mockRequest('unknown.example.com'), headers);

    expect(result.tenantId).toBe('default-tenant-id');
    expect(result.tenantSlug).toBe('default');
    expect(result.tenantStatus).toBe('active');
  });

  it('falls back to default when tenant resolution throws', async () => {
    vi.mocked(resolveTenantFromHostname).mockRejectedValueOnce(new Error('db down'));

    const headers = new Headers();
    const result = await resolveTenant(mockRequest('broken.example.com'), headers);

    expect(result.tenantId).toBe('default-tenant-id');
  });

  it('uses "localhost:3000" when host header is missing', async () => {
    vi.mocked(resolveTenantFromHostname).mockResolvedValueOnce(null);
    const headers = new Headers();
    const request = { headers: { get: () => null }, url: 'http://x' } as any;

    await resolveTenant(request, headers);
    expect(resolveTenantFromHostname).toHaveBeenCalledWith('localhost:3000');
  });
});

describe('handleSuspendedTenant', () => {
  function mockReq(path: string) {
    return { url: `http://x${path}` } as any;
  }

  it('returns null for non-suspended tenants', () => {
    expect(handleSuspendedTenant(mockReq('/dashboard'), new Headers(), 'active', '/dashboard')).toBeNull();
  });

  it('rewrites to /suspended when tenant is suspended', () => {
    const res = handleSuspendedTenant(mockReq('/dashboard'), new Headers(), 'suspended', '/dashboard');
    expect(res).not.toBeNull();
    expect(res!.headers.get('x-middleware-rewrite')).toContain('/suspended');
  });

  it('lets /suspended page itself through to avoid redirect loop', () => {
    expect(handleSuspendedTenant(mockReq('/suspended'), new Headers(), 'suspended', '/suspended')).toBeNull();
  });

  it('lets Next.js internals through even when suspended', () => {
    expect(handleSuspendedTenant(mockReq('/_next/static/x.js'), new Headers(), 'suspended', '/_next/static/x.js')).toBeNull();
  });

  it('lets favicon and PNG assets through even when suspended', () => {
    expect(handleSuspendedTenant(mockReq('/favicon.ico'), new Headers(), 'suspended', '/favicon.ico')).toBeNull();
    expect(handleSuspendedTenant(mockReq('/logo.png'), new Headers(), 'suspended', '/logo.png')).toBeNull();
  });
});
