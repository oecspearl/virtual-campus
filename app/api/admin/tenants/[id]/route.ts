import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { invalidateTenantCache } from '@/lib/tenant-cache';

// GET - Fetch a single tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin', 'tenant_admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: tenant, error } = await tq
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get member count
    const { count } = await tq
      .from('tenant_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id);

    return NextResponse.json({ tenant: { ...tenant, member_count: count || 0 } });
  } catch (error) {
    console.error('Tenant GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin', 'tenant_admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, custom_domain, status, plan, max_users, settings } = body;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get current tenant to invalidate cache
    const { data: currentTenant } = await tq
      .from('tenants')
      .select('slug')
      .eq('id', id)
      .single();

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (custom_domain !== undefined) updateData.custom_domain = custom_domain || null;
    if (status !== undefined) updateData.status = status;
    if (plan !== undefined) updateData.plan = plan;
    if (max_users !== undefined) updateData.max_users = max_users;
    if (settings !== undefined) updateData.settings = settings;

    const { data: tenant, error } = await tq
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
    }

    // Invalidate cache for old and new slugs
    if (currentTenant?.slug) invalidateTenantCache(currentTenant.slug);
    if (slug) invalidateTenantCache(slug);

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('Tenant PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a tenant (super_admin only, cannot delete default)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin'])) {
      return createAuthResponse('Forbidden: Super admin access required', 403);
    }

    const { id } = await params;

    if (id === '00000000-0000-0000-0000-000000000001') {
      return NextResponse.json({ error: 'Cannot delete the default tenant' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: tenant } = await tq
      .from('tenants')
      .select('slug')
      .eq('id', id)
      .single();

    const { error } = await tq
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
    }

    if (tenant?.slug) invalidateTenantCache(tenant.slug);

    return NextResponse.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Tenant DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
