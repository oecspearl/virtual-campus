import { NextRequest, NextResponse } from 'next/server';
import { getCachedTenant } from '@/lib/tenant-cache';
import { getDefaultTenantId } from '@/lib/tenant';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

// Public endpoint - returns current tenant info based on x-tenant-id header
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');

    if (!tenantId) {
      // Fallback: resolve from default
      const defaultSlug = process.env.DEFAULT_TENANT_SLUG || 'default';
      const tenant = await getCachedTenant(defaultSlug);
      if (tenant) {
        return NextResponse.json({
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            settings: tenant.settings,
            plan: tenant.plan,
          },
        });
      }
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // If we have the slug, use the cache
    if (tenantSlug) {
      const tenant = await getCachedTenant(tenantSlug);
      if (tenant) {
        return NextResponse.json({
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            settings: tenant.settings,
            plan: tenant.plan,
          },
        });
      }
    }

    // Fallback: query by ID
    const serviceSupabase = createServiceSupabaseClient();
    const { data, error } = await serviceSupabase
      .from('tenants')
      .select('id, name, slug, status, settings, plan')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ tenant: data });
  } catch (error) {
    console.error('Tenant current API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
