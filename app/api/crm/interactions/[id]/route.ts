import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/interactions/[id]
 * Get a single interaction by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('crm_interactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('CRM Interaction GET: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/crm/interactions/[id]
 * Update an interaction.
 * Body: { subject?, body?, is_private?, metadata? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership (unless admin)
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      const { data: existing } = await tq
        .from('crm_interactions')
        .select('created_by')
        .eq('id', id)
        .single();

      if (existing && existing.created_by !== authResult.userProfile.id) {
        return NextResponse.json({ error: 'You can only edit your own interactions' }, { status: 403 });
      }
    }

    // Only allow updating certain fields
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.subject !== undefined) updates.subject = body.subject;
    if (body.body !== undefined) updates.body = body.body;
    if (body.is_private !== undefined) updates.is_private = body.is_private;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const { data, error } = await tq
      .from('crm_interactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('CRM Interaction PUT: Error', error);
      return NextResponse.json({ error: 'Failed to update interaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true, interaction: data });
  } catch (error: any) {
    console.error('CRM Interaction PUT: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/interactions/[id]
 * Delete an interaction. Only the creator or admin can delete.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership (unless admin)
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      const { data: existing } = await tq
        .from('crm_interactions')
        .select('created_by')
        .eq('id', id)
        .single();

      if (existing && existing.created_by !== authResult.userProfile.id) {
        return NextResponse.json({ error: 'You can only delete your own interactions' }, { status: 403 });
      }
    }

    const { error } = await tq
      .from('crm_interactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('CRM Interaction DELETE: Error', error);
      return NextResponse.json({ error: 'Failed to delete interaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('CRM Interaction DELETE: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
