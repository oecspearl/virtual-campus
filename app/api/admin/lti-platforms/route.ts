/**
 * Admin API: LTI External Platforms Management
 * GET: List all external platforms
 * POST: Create new external platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile?.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: platforms, error } = await tq
      .from('lti_external_platforms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching LTI platforms:', error);
      return NextResponse.json({ error: 'Failed to fetch platforms' }, { status: 500 });
    }

    return NextResponse.json(platforms || []);
  } catch (error) {
    console.error('LTI platforms GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile?.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    } = body;

    if (!name || !issuer || !client_id || !jwks_uri || !launch_url) {
      return NextResponse.json(
        { error: 'Missing required fields: name, issuer, client_id, jwks_uri, launch_url' },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if issuer already exists
    const { data: existing } = await tq
      .from('lti_external_platforms')
      .select('id')
      .eq('issuer', issuer)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A platform with this issuer already exists' },
        { status: 409 }
      );
    }

    // Create platform
    const { data: platform, error: insertError } = await tq
      .from('lti_external_platforms')
      .insert({
        name,
        description: description || null,
        issuer,
        client_id,
        deployment_id: deployment_id || null,
        authorization_server: authorization_server || token_endpoint || null,
        token_endpoint: token_endpoint || null,
        jwks_uri,
        platform_public_key: platform_public_key || null,
        launch_url,
        auto_provision_users: auto_provision_users !== undefined ? auto_provision_users : true,
        default_user_role: default_user_role || 'student',
        status: 'active',
        created_by: authResult.user?.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating LTI platform:', insertError);
      return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
    }

    return NextResponse.json(platform, { status: 201 });
  } catch (error) {
    console.error('LTI platforms POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



