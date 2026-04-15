import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';

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

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const entityType = searchParams.get('entity_type');

    if (!connectionId) {
      return NextResponse.json({ error: 'connection_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('sonisweb_field_mappings')
      .select('*')
      .eq('connection_id', connectionId);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query.order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching field mappings:', error);
      return NextResponse.json({ error: 'Failed to fetch field mappings' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Field mappings GET error:', error);
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
    const { connection_id, mappings } = body;

    if (!connection_id || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: 'connection_id and mappings array are required' },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const results = [];
    for (const mapping of mappings) {
      const { id, ...fields } = mapping;

      if (id) {
        // Update existing mapping
        const { data, error } = await tq
          .from('sonisweb_field_mappings')
          .update(fields)
          .eq('id', id)
          .eq('connection_id', connection_id)
          .select()
          .single();

        if (error) {
          results.push({ id, error: error.message });
        } else {
          results.push(data);
        }
      } else {
        // Create new mapping
        const { data, error } = await tq
          .from('sonisweb_field_mappings')
          .insert({ ...fields, connection_id })
          .select()
          .single();

        if (error) {
          results.push({ error: error.message, fields });
        } else {
          results.push(data);
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Field mappings POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
