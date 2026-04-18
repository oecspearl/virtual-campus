import { vi } from 'vitest';

/**
 * Builds a mock TenantQuery whose `from(table)` chains behave according to
 * per-table stubs supplied by the test. Every chain call is recorded so tests
 * can assert on the full sequence of operations.
 *
 * Usage:
 *   const { tq, calls } = makeTenantQueryMock({
 *     assignments: { insert: { data: { id: 'a-1', lesson_id: 'l-1' }, error: null } },
 *     lessons:     { select: { data: { course_id: 'c-1' }, error: null } },
 *   });
 */

type Result = { data: unknown; error: unknown };

export interface TableStubs {
  /** Result for `.insert(...).select().single()` */
  insert?: Result;
  /** Result for `.update(...).eq(...)` (awaited) */
  update?: Result;
  /** Result for `.select(...).eq(...).single()` */
  select?: Result;
  /** Result for `.select(...).eq(...)` (awaited, no .single()) */
  selectList?: Result;
}

export interface TenantQueryMockOptions {
  /** Stubs keyed by table name. */
  [tableName: string]: TableStubs | undefined;
}

export interface ChainCall {
  table?: string;
  method: string;
  args: unknown[];
  viaRaw?: boolean;
}

export function makeTenantQueryMock(tables: TenantQueryMockOptions = {}, rpcResult: Result = { data: null, error: null }) {
  const calls: ChainCall[] = [];
  let currentTable: string | null = null;
  let currentViaRaw = false;
  let lastOp: 'insert' | 'update' | 'select' | null = null;

  const chain: any = {};
  const chainMethods = ['select', 'eq', 'order', 'limit', 'or', 'match'];

  for (const m of chainMethods) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable ?? undefined, method: m, args, viaRaw: currentViaRaw });
      // `.select()` after `.insert()` / `.update()` is the "returning" clause
      // — don't let it clobber the real mutation op.
      if (m === 'select' && lastOp !== 'insert' && lastOp !== 'update') {
        lastOp = 'select';
      }
      return chain;
    });
  }

  chain.insert = vi.fn((...args: unknown[]) => {
    calls.push({ table: currentTable ?? undefined, method: 'insert', args, viaRaw: currentViaRaw });
    lastOp = 'insert';
    return chain;
  });

  chain.update = vi.fn((...args: unknown[]) => {
    calls.push({ table: currentTable ?? undefined, method: 'update', args, viaRaw: currentViaRaw });
    lastOp = 'update';
    return chain;
  });

  chain.upsert = vi.fn((...args: unknown[]) => {
    calls.push({ table: currentTable ?? undefined, method: 'upsert', args, viaRaw: currentViaRaw });
    lastOp = 'insert';
    return chain;
  });

  chain.delete = vi.fn((...args: unknown[]) => {
    calls.push({ table: currentTable ?? undefined, method: 'delete', args, viaRaw: currentViaRaw });
    return chain;
  });

  chain.single = vi.fn(() => {
    const stubs = tables[currentTable ?? ''];
    if (lastOp === 'insert' && stubs?.insert) return Promise.resolve(stubs.insert);
    if (lastOp === 'select' && stubs?.select) return Promise.resolve(stubs.select);
    return Promise.resolve({ data: null, error: null });
  });

  // Make the chain thenable for awaits without .single()
  chain.then = (onFulfilled: (v: Result) => unknown) => {
    const stubs = tables[currentTable ?? ''];
    if (lastOp === 'update' && stubs?.update) return Promise.resolve(onFulfilled(stubs.update));
    if (lastOp === 'insert' && stubs?.insert) return Promise.resolve(onFulfilled(stubs.insert));
    if (lastOp === 'select' && stubs?.selectList) return Promise.resolve(onFulfilled(stubs.selectList));
    return Promise.resolve(onFulfilled({ data: [], error: null }));
  };

  const fromFn = (viaRaw: boolean) => (table: string) => {
    currentTable = table;
    currentViaRaw = viaRaw;
    lastOp = null;
    return chain;
  };

  const tq: any = {
    from: vi.fn(fromFn(false)),
    raw: {
      from: vi.fn(fromFn(true)),
      rpc: vi.fn((name: string, args: unknown) => {
        calls.push({ method: 'rpc', args: [name, args], viaRaw: true });
        return Promise.resolve(rpcResult);
      }),
    },
    tenantId: 'tenant-test',
  };

  return { tq, calls };
}

/** Find the arguments passed to a specific method call on a given table. */
export function findCall(calls: ChainCall[], table: string, method: string): ChainCall | undefined {
  return calls.find((c) => c.table === table && c.method === method);
}
