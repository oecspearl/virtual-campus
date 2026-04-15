/**
 * Admin API: LTI External Platform Management (Single)
 * GET: Get platform by ID
 * PUT: Update platform
 * DELETE: Delete platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile?.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: platform, error } = await tq
      .from('lti_external_platforms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching LTI platform:', error);
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    return NextResponse.json(platform);
  } catch (error) {
    console.error('LTI platform GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile?.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      issuer,
      client_id,
      deployment_id,
      authorization_server,
      token_endpoint,
      jwks_uri,
      platform_public_key,
      launch_url,
      auto_provision_users,
      default_user_role,
      status,
    } = body;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (issuer !== undefined) updates.issuer = issuer;
    if (client_id !== undefined) updates.client_id = client_id;
    if (deployment_id !== undefined) updates.deployment_id = deployment_id;
    if (authorization_server !== undefined) updates.authorization_server = authorization_server;
    if (token_endpoint !== undefined) updates.token_endpoint = token_endpoint;
    if (jwks_uri !== undefined) updates.jwks_uri = jwks_uri;
    if (platform_public_key !== undefined) updates.platform_public_key = platform_public_key;
    if (launch_url !== undefined) updates.launch_url = launch_url;
    if (auto_provision_users !== undefined) updates.auto_provision_users = auto_provision_users;
    if (default_user_role !== undefined) updates.default_user_role = default_user_role;
    if (status !== undefined) updates.status = status;

    const { data: platform, error: updateError } = await tq
      .from('lti_external_platforms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating LTI platform:', updateError);
      return NextResponse.json({ error: 'Failed to update platform' }, { status: 500 });
    }

    return NextResponse.json(platform);
  } catch (error) {
    console.error('LTI platform PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile?.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { error } = await tq
      .from('lti_external_platforms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting LTI platform:', error);
      return NextResponse.json({ error: 'Failed to delete platform' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Platform deleted successfully' });
  } catch (error) {
    console.error('LTI platform DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



