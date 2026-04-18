import { createServiceSupabaseClient } from './supabase-server';

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

/**
 * Shape of the object returned by `createTenantQuery()`.
 * Use this to type `tq` parameters in service-layer functions.
 */
export type TenantQuery = ReturnType<typeof createTenantQuery>;

/**
 * Creates a tenant-scoped query builder that automatically applies
 * tenant_id filtering on all operations. This is the primary mechanism
 * for tenant isolation since most API routes use the service client
 * which bypasses RLS policies.
 *
 * Usage in API routes:
 *   const tenantId = getTenantIdFromRequest(request);
 *   const tq = createTenantQuery(tenantId);
 *   const { data } = await tq.from('courses').select('*');
 *   // Automatically filtered to tenant
 *
 * For stricter row typing, pass a row shape generic on individual methods:
 *   type Course = { id: string; title: string; tenant_id: string };
 *   const { data } = await tq.from('courses').select<Course>('*');
 *   // data is now Course[] | null
 */
export function createTenantQuery(tenantId: string) {
  if (!tenantId) {
    throw new Error('tenant_id is required for tenant-scoped queries');
  }

  const serviceSupabase = createServiceSupabaseClient();

  return {
    /**
     * Returns a tenant-filtered query builder for the given table.
     * All select/insert/update/delete/upsert operations are automatically
     * scoped to the tenant.
     */
    from(table: string) {
      return new TenantFilteredQuery(serviceSupabase, table, tenantId);
    },

    /**
     * Raw service client for operations that don't need tenant scoping
     * (e.g., auth.admin.createUser, cross-tenant lookups by super_admin).
     */
    raw: serviceSupabase,

    /** The resolved tenant ID */
    tenantId,
  };
}

class TenantFilteredQuery {
  // Client is strongly typed — callers get autocomplete on Supabase methods.
  private supabase: ServiceClient;
  private table: string;
  private tenantId: string;

  constructor(supabase: ServiceClient, table: string, tenantId: string) {
    this.supabase = supabase;
    this.table = table;
    this.tenantId = tenantId;
  }

  /**
   * SELECT with automatic tenant_id filter.
   * Returns a Supabase query builder with .eq('tenant_id', tenantId) applied.
   *
   * The return is typed `any` by default so existing callers don't need a
   * row shape. Pass a generic parameter for stricter typing.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select<_T = any>(
    columns: string = '*',
    options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    return this.supabase
      .from(this.table)
      .select(columns, options)
      .eq('tenant_id', this.tenantId);
  }

  /**
   * INSERT with automatic tenant_id injection into each row.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(values: Record<string, unknown> | Record<string, unknown>[]): any {
    const rows = Array.isArray(values) ? values : [values];
    const withTenant = rows.map((row) => ({ ...row, tenant_id: this.tenantId }));
    return this.supabase
      .from(this.table)
      .insert(withTenant.length === 1 ? withTenant[0] : withTenant);
  }

  /**
   * UPDATE with automatic tenant_id filter.
   * Returns a query builder — you still chain .eq(), .match(), etc.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(values: Record<string, unknown>): any {
    return this.supabase
      .from(this.table)
      .update(values)
      .eq('tenant_id', this.tenantId);
  }

  /**
   * DELETE with automatic tenant_id filter.
   * Returns a query builder — chain .eq() to specify which rows.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(): any {
    return this.supabase.from(this.table).delete().eq('tenant_id', this.tenantId);
  }

  /**
   * UPSERT with automatic tenant_id injection into each row.
   */
  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    const rows = Array.isArray(values) ? values : [values];
    const withTenant = rows.map((row) => ({ ...row, tenant_id: this.tenantId }));
    return this.supabase
      .from(this.table)
      .upsert(withTenant.length === 1 ? withTenant[0] : withTenant, options);
  }
}

/**
 * Extracts the tenant_id from request headers (set by middleware).
 * Supports x-tenant-override header for super_admin users to switch tenant context.
 * Throws if the header is missing — this prevents accidental cross-tenant queries.
 *
 * @param request - The incoming request
 * @param authenticatedRole - Optional pre-verified role from authenticateUser().
 *   Pass this after authentication so the override works without x-user-role header.
 */
export function getTenantIdFromRequest(request: Request, authenticatedRole?: string): string {
  // Check for super_admin tenant override
  const override = request.headers.get('x-tenant-override');
  if (override) {
    // Only super_admin can use the override
    const userRole = authenticatedRole || request.headers.get('x-user-role');
    if (userRole === 'super_admin') {
      return override;
    }
    // Silently ignore override for non-super_admin users
  }

  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    throw new Error('Missing x-tenant-id header. Tenant resolution failed in middleware.');
  }
  return tenantId;
}

/**
 * Non-throwing version that returns null if header is missing.
 * Useful for public endpoints where tenant context is optional.
 */
export function getTenantIdFromRequestOptional(request: Request): string | null {
  return request.headers.get('x-tenant-id');
}
