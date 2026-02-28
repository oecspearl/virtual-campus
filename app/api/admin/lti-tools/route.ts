/**
 * Admin API: LTI Tools Management
 * GET: List all LTI tools
 * POST: Create new LTI tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/database-helpers';
import { authenticateUser } from '@/lib/api-auth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: tools, error } = await tq
      .from('lti_tools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching LTI tools:', error);
      return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
    }

    return NextResponse.json(tools || []);
  } catch (error) {
    console.error('LTI tools GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      tool_url,
      login_url,
      launch_url,
      client_id,
      deployment_id,
      tool_keyset_url,
      tool_oidc_login_url,
    } = body;

    if (!name || !tool_url || !launch_url || !client_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, tool_url, launch_url, client_id' },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if client_id already exists
    const { data: existing } = await tq
      .from('lti_tools')
      .select('id')
      .eq('client_id', client_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A tool with this client_id already exists' },
        { status: 409 }
      );
    }

    // Create tool
    const { data: tool, error: insertError } = await tq
      .from('lti_tools')
      .insert({
        name,
        description: description || null,
        tool_url,
        login_url: login_url || null,
        launch_url,
        client_id,
        deployment_id: deployment_id || null,
        tool_keyset_url: tool_keyset_url || null,
        tool_oidc_login_url: tool_oidc_login_url || null,
        status: 'active',
        created_by: authResult.user?.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating LTI tool:', insertError);
      return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
    }

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    console.error('LTI tools POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

