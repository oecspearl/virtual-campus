import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';
import { encryptCredential } from '@/lib/sonisweb/client';

const ALLOWED_ROLES = ['admin', 'super_admin', 'tenant_admin'] as const;

const PUBLIC_FIELDS = 'id, provider_type, display_name, enabled, client_id, provider_tenant_id, authorization_url, token_url, userinfo_url, scopes, auto_provision_users, default_role, email_domain_restriction, button_label, button_icon, sort_order, connection_status, last_used_at, created_at, updated_at';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('oauth_providers')
      .select(PUBLIC_FIELDS)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('OAuth provider GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'display_name', 'enabled', 'client_id', 'provider_tenant_id',
      'authorization_url', 'token_url', 'userinfo_url', 'scopes',
      'auto_provision_users', 'default_role', 'email_domain_restriction',
      'button_label', 'button_icon', 'sort_order', 'connection_status',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle secret update separately (needs encryption)
    if (body.client_secret) {
      updateData.client_secret_encrypted = encryptCredential(body.client_secret);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await tq
      .from('oauth_providers')
      .update(updateData)
      .eq('id', id)
      .select(PUBLIC_FIELDS)
      .single();

    if (error || !data) {
      console.error('Error updating OAuth provider:', error);
      return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('OAuth provider PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from('oauth_providers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting OAuth provider:', error);
      return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OAuth provider DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
