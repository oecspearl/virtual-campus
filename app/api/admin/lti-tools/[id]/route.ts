/**
 * Admin API: LTI Tool Management (Single)
 * GET: Get tool by ID
 * PUT: Update tool
 * DELETE: Delete tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/database-helpers';
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

    if (!hasRole(authResult.userProfile, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: tool, error } = await tq
      .from('lti_tools')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json(tool);
  } catch (error) {
    console.error('LTI tool GET error:', error);
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
      status,
    } = body;

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if client_id is being changed and if it conflicts
    if (client_id) {
      const { data: existing } = await tq
        .from('lti_tools')
        .select('id')
        .eq('client_id', client_id)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'A tool with this client_id already exists' },
          { status: 409 }
        );
      }
    }

    // Update tool
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (tool_url !== undefined) updateData.tool_url = tool_url;
    if (login_url !== undefined) updateData.login_url = login_url;
    if (launch_url !== undefined) updateData.launch_url = launch_url;
    if (client_id !== undefined) updateData.client_id = client_id;
    if (deployment_id !== undefined) updateData.deployment_id = deployment_id;
    if (tool_keyset_url !== undefined) updateData.tool_keyset_url = tool_keyset_url;
    if (tool_oidc_login_url !== undefined) updateData.tool_oidc_login_url = tool_oidc_login_url;
    if (status !== undefined) updateData.status = status;

    const { data: tool, error: updateError } = await tq
      .from('lti_tools')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating LTI tool:', updateError);
      return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
    }

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json(tool);
  } catch (error) {
    console.error('LTI tool PUT error:', error);
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

    if (!hasRole(authResult.userProfile, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { error } = await tq
      .from('lti_tools')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting LTI tool:', error);
      return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LTI tool DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

