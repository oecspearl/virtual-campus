import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

// GET - List tenant members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin', 'tenant_admin', 'admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { id: targetTenantId } = await params;
    const reqTenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(reqTenantId);

    const { data: members, error } = await tq
      .from('tenant_memberships')
      .select(`
        id,
        role,
        is_primary,
        created_at,
        users (id, name, email, role)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Tenant members GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a member to the tenant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin', 'tenant_admin', 'admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { id: tenantId } = await params;
    const body = await request.json();
    const { user_id, email, role } = body;

    const serviceSupabase = createServiceSupabaseClient();

    // Find user by ID or email
    let userId = user_id;
    if (!userId && email) {
      const { data: user } = await serviceSupabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (!user) {
        return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
      }
      userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'user_id or email is required' }, { status: 400 });
    }

    // Check if already a member
    const { data: existing } = await serviceSupabase
      .from('tenant_memberships')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this tenant' }, { status: 409 });
    }

    // Add membership
    const { data: membership, error } = await serviceSupabase
      .from('tenant_memberships')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role: role || 'student',
        is_primary: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    console.error('Tenant members POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a member from the tenant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin', 'tenant_admin', 'admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { id: tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id query param is required' }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    const { error } = await serviceSupabase
      .from('tenant_memberships')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Tenant members DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
