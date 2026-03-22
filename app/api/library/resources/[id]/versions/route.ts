import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

// GET - Fetch version history for a library resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: versions, error } = await tq
      .from('library_resource_versions')
      .select('*')
      .eq('resource_id', id)
      .order('version', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ versions: versions || [] });
  } catch (error: any) {
    console.error('Error fetching resource versions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resource versions' },
      { status: 500 }
    );
  }
}
