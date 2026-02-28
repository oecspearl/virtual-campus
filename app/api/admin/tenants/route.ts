import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

// GET - List all tenants (super_admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin'])) {
      return createAuthResponse('Forbidden: Super admin access required', 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: tenants, error } = await tq
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
    }

    // Get member counts per tenant
    const { data: memberCounts } = await tq
      .from('tenant_memberships')
      .select('tenant_id')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach(m => { counts[m.tenant_id] = (counts[m.tenant_id] || 0) + 1; });
        return { data: counts };
      });

    const tenantsWithCounts = tenants?.map(t => ({
      ...t,
      member_count: memberCounts?.[t.id] || 0,
    }));

    return NextResponse.json({ tenants: tenantsWithCounts });
  } catch (error) {
    console.error('Tenants GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new tenant (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin'])) {
      return createAuthResponse('Forbidden: Super admin access required', 403);
    }

    const body = await request.json();
    const { name, slug, custom_domain, plan, max_users } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must only contain lowercase letters, numbers, and hyphens' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if slug is taken
    const { data: existing } = await tq
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'A tenant with this slug already exists' }, { status: 409 });
    }

    // Create tenant (branding settings are auto-seeded via DB trigger)
    const { data: tenant, error } = await tq
      .from('tenants')
      .insert({
        name,
        slug,
        custom_domain: custom_domain || null,
        plan: plan || 'standard',
        max_users: max_users || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tenant:', error);
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }

    // Add the creating super_admin as a member
    await tq
      .from('tenant_memberships')
      .insert({
        tenant_id: tenant.id,
        user_id: authResult.user.id,
        role: 'super_admin',
        is_primary: false,
      });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error('Tenants POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
