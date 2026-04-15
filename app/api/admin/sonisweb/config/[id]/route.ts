import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';
import { encryptCredential } from '@/lib/sonisweb/client';

const ALLOWED_ROLES = ['admin', 'super_admin', 'tenant_admin'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      .from('sonisweb_connections')
      .select('id, name, base_url, api_username, api_mode, auth_flow, sync_schedule, sync_enabled, student_sync_enabled, enrollment_sync_enabled, grade_passback_enabled, last_sync_at, last_sync_status, connection_status, settings, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('SonisWeb config GET error:', error);
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
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    const allowedFields = [
      'name', 'base_url', 'api_username', 'api_mode', 'auth_flow',
      'sync_schedule', 'sync_enabled', 'student_sync_enabled',
      'enrollment_sync_enabled', 'grade_passback_enabled',
      'connection_status', 'settings',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle password update separately (needs encryption)
    if (body.api_password) {
      updateData.api_password_encrypted = encryptCredential(body.api_password);
    }

    if (updateData.base_url) {
      updateData.base_url = updateData.base_url.replace(/\/+$/, '');
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await tq
      .from('sonisweb_connections')
      .update(updateData)
      .eq('id', id)
      .select('id, name, base_url, api_mode, auth_flow, sync_schedule, sync_enabled, student_sync_enabled, enrollment_sync_enabled, grade_passback_enabled, connection_status, settings, updated_at')
      .single();

    if (error) {
      console.error('Error updating SonisWeb connection:', error);
      return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('SonisWeb config PUT error:', error);
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
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from('sonisweb_connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting SonisWeb connection:', error);
      return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SonisWeb config DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
