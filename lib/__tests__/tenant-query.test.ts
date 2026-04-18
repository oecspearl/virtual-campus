import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock the Supabase service client so we can inspect the calls ───────────

const chainRecorder = vi.fn();

function makeChainableMock() {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'match', 'single', 'order', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn((...args: any[]) => {
      chainRecorder({ method: m, args });
      return chain;
    });
  }
  return chain;
}

const mockFromReturn = makeChainableMock();
const mockServiceClient = {
  from: vi.fn((_table: string) => mockFromReturn),
};

vi.mock('../supabase-server', () => ({
  createServiceSupabaseClient: vi.fn(() => mockServiceClient),
}));

import { createTenantQuery, getTenantIdFromRequest, getTenantIdFromRequestOptional } from '../tenant-query';

beforeEach(() => {
  chainRecorder.mockClear();
  vi.mocked(mockServiceClient.from).mockClear();
});

describe('createTenantQuery', () => {
  it('throws when tenantId is missing', () => {
    expect(() => createTenantQuery('')).toThrow(/tenant_id is required/);
  });

  it('exposes tenantId and raw service client', () => {
    const tq = createTenantQuery('tenant-1');
    expect(tq.tenantId).toBe('tenant-1');
    expect(tq.raw).toBe(mockServiceClient);
  });
});

describe('TenantFilteredQuery.select', () => {
  it('auto-applies tenant_id filter to select queries', () => {
    const tq = createTenantQuery('tenant-1');
    tq.from('courses').select('*');

    const eqCall = chainRecorder.mock.calls.find((c) => c[0].method === 'eq');
    expect(eqCall?.[0].args).toEqual(['tenant_id', 'tenant-1']);
  });

  it('passes columns and options through', () => {
    const tq = createTenantQuery('tenant-1');
    tq.from('courses').select('id, title', { count: 'exact', head: true });

    const selectCall = chainRecorder.mock.calls.find((c) => c[0].method === 'select');
    expect(selectCall?.[0].args[0]).toBe('id, title');
    expect(selectCall?.[0].args[1]).toEqual({ count: 'exact', head: true });
  });
});

describe('TenantFilteredQuery.insert', () => {
  it('injects tenant_id into a single-row insert', () => {
    const tq = createTenantQuery('tenant-1');
    tq.from('courses').insert({ title: 'New Course' });

    const insertCall = chainRecorder.mock.calls.find((c) => c[0].method === 'insert');
    expect(insertCall?.[0].args[0]).toEqual({ title: 'New Course', tenant_id: 'tenant-1' });
  });

  it('injects tenant_id into every row of a batch insert', () => {
    const tq = createTenantQuery('tenant-1');
    tq.from('courses').insert([{ title: 'A' }, { title: 'B' }]);

    const insertCall = chainRecorder.mock.calls.find((c) => c[0].method === 'insert');
    expect(insertCall?.[0].args[0]).toEqual([
      { title: 'A', tenant_id: 'tenant-1' },
      { title: 'B', tenant_id: 'tenant-1' },
    ]);
  });

  it('does not mutate the caller-supplied row objects', () => {
    const row = { title: 'X' };
    const tq = createTenantQuery('tenant-1');
    tq.from('courses').insert(row);
    expect(row).toEqual({ title: 'X' });
  });
});

describe('TenantFilteredQuery.update', () => {
  it('auto-applies tenant_id filter to updates', () => {
    const tq = createTenantQuery('tenant-1');
    tq.from('courses').update({ title: 'Changed' });

    const eqCall = chainRecorder.mock.calls.find((c) => c[0].method === 'eq');
    expect(eqCall?.[0].args).toEqual(['tenant_id', 'tenant-1']);
  });
});

describe('TenantFilteredQuery.delete', () => {
  it('auto-applies tenant_id filter to deletes', () => {
    const tq = createTenantQuery('tenant-1');
    tq.from('courses').delete();

    const eqCall = chainRecorder.mock.calls.find((c) => c[0].method === 'eq');
    expect(eqCall?.[0].args).toEqual(['tenant_id', 'tenant-1']);
  });
});

describe('TenantFilteredQuery.upsert', () => {
  it('injects tenant_id into upsert rows', () => {
    const tq = createTenantQuery('tenant-1');
    tq.from('settings').upsert({ key: 'foo', value: 'bar' });

    const upsertCall = chainRecorder.mock.calls.find((c) => c[0].method === 'upsert');
    expect(upsertCall?.[0].args[0]).toEqual({ key: 'foo', value: 'bar', tenant_id: 'tenant-1' });
  });

  it('forwards upsert options', () => {
    const tq = createTenantQuery('tenant-1');
    tq.from('settings').upsert({ key: 'a' }, { onConflict: 'key' });

    const upsertCall = chainRecorder.mock.calls.find((c) => c[0].method === 'upsert');
    expect(upsertCall?.[0].args[1]).toEqual({ onConflict: 'key' });
  });
});

// ─── Header-based tenant resolution ─────────────────────────────────────────

function reqWithHeaders(headers: Record<string, string>) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as any;
}

describe('getTenantIdFromRequest', () => {
  it('returns the x-tenant-id header', () => {
    expect(getTenantIdFromRequest(reqWithHeaders({ 'x-tenant-id': 'tenant-1' }))).toBe('tenant-1');
  });

  it('throws when x-tenant-id is missing', () => {
    expect(() => getTenantIdFromRequest(reqWithHeaders({}))).toThrow(/x-tenant-id/);
  });

  it('honors x-tenant-override for super_admin via authenticatedRole argument', () => {
    const req = reqWithHeaders({ 'x-tenant-id': 'tenant-1', 'x-tenant-override': 'tenant-other' });
    expect(getTenantIdFromRequest(req, 'super_admin')).toBe('tenant-other');
  });

  it('honors x-tenant-override for super_admin via x-user-role header fallback', () => {
    const req = reqWithHeaders({
      'x-tenant-id': 'tenant-1',
      'x-tenant-override': 'tenant-other',
      'x-user-role': 'super_admin',
    });
    expect(getTenantIdFromRequest(req)).toBe('tenant-other');
  });

  it('silently ignores x-tenant-override for non-super_admin roles', () => {
    const req = reqWithHeaders({
      'x-tenant-id': 'tenant-1',
      'x-tenant-override': 'tenant-other',
      'x-user-role': 'admin',
    });
    expect(getTenantIdFromRequest(req)).toBe('tenant-1');
  });
});

describe('getTenantIdFromRequestOptional', () => {
  it('returns the x-tenant-id when present', () => {
    expect(getTenantIdFromRequestOptional(reqWithHeaders({ 'x-tenant-id': 'tenant-1' }))).toBe('tenant-1');
  });

  it('returns null when missing (instead of throwing)', () => {
    expect(getTenantIdFromRequestOptional(reqWithHeaders({}))).toBeNull();
  });
});
