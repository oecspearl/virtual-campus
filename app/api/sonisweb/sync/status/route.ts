import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/database-helpers';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const syncType = searchParams.get('sync_type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!connectionId) {
      return NextResponse.json({ error: 'connection_id query parameter is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('sonisweb_sync_logs')
      .select('*')
      .eq('connection_id', connectionId);

    if (syncType) {
      query = query.eq('sync_type', syncType);
    }

    const { data, error } = await query
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching sync logs:', error);
      return NextResponse.json({ error: 'Failed to fetch sync logs' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
