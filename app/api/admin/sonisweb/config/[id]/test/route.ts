import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/database-helpers';
import { authenticateUser } from '@/lib/api-auth';
import { createSonisWebClient } from '@/lib/sonisweb/client';
import type { SonisWebConnection } from '@/lib/sonisweb/types';

const ALLOWED_ROLES = ['admin', 'super_admin', 'tenant_admin'];

export async function POST(
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

    const { data: connection, error } = await tq
      .from('sonisweb_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const client = createSonisWebClient(connection as SonisWebConnection);
    const result = await client.testConnection();

    // Update connection status based on test result
    await tq
      .from('sonisweb_connections')
      .update({
        connection_status: result.success ? 'connected' : 'failed',
      })
      .eq('id', id);

    return NextResponse.json({
      success: result.success,
      error: result.error || null,
      connection_status: result.success ? 'connected' : 'failed',
    });
  } catch (error: any) {
    console.error('SonisWeb test connection error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}
