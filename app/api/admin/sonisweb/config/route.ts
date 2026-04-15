import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';
import { encryptCredential } from '@/lib/sonisweb/client';
import { seedDefaultMappings } from '@/lib/sonisweb/field-mapping';

const ALLOWED_ROLES = ['admin', 'super_admin', 'tenant_admin'] as const;

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('sonisweb_connections')
      .select('id, name, base_url, api_mode, auth_flow, sync_schedule, sync_enabled, student_sync_enabled, enrollment_sync_enabled, grade_passback_enabled, last_sync_at, last_sync_status, connection_status, settings, created_at, updated_at');

    if (error) {
      console.error('Error fetching SonisWeb connections:', error);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('SonisWeb config GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, base_url, api_username, api_password, api_mode, auth_flow, sync_schedule, settings } = body;

    if (!name || !base_url || !api_username || !api_password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, base_url, api_username, api_password' },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check for duplicate name within tenant
    const { data: existing } = await tq
      .from('sonisweb_connections')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A connection with this name already exists' },
        { status: 409 }
      );
    }

    const encryptedPassword = encryptCredential(api_password);

    const { data: connection, error: insertError } = await tq
      .from('sonisweb_connections')
      .insert({
        name,
        base_url: base_url.replace(/\/+$/, ''),
        api_username,
        api_password_encrypted: encryptedPassword,
        api_mode: api_mode || 'both',
        auth_flow: auth_flow || 'welcome_email',
        sync_schedule: sync_schedule || '0 2 * * *',
        settings: settings || {},
        connection_status: 'pending',
      })
      .select('id, name, base_url, api_mode, auth_flow, sync_schedule, sync_enabled, connection_status, settings, created_at')
      .single();

    if (insertError) {
      console.error('Error creating SonisWeb connection:', insertError);
      return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
    }

    // Seed default field mappings for the new connection
    try {
      await seedDefaultMappings(connection.id, tenantId);
    } catch (seedError) {
      console.error('Warning: Failed to seed default field mappings:', seedError);
    }

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error('SonisWeb config POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
