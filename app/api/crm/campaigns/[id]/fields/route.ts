import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/campaigns/[id]/fields
 * List application fields for a campaign, ordered by "order".
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return createAuthResponse(authResult.error || 'Unauthorized', authResult.status || 401);
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: fields, error } = await tq
      .from('programme_application_fields')
      .select('*')
      .eq('campaign_id', id)
      .order('order', { ascending: true });

    if (error) {
      console.error('Campaign Fields GET: Error', error);
      return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 });
    }

    return NextResponse.json({ fields: fields || [] });
  } catch (error: any) {
    console.error('Campaign Fields GET: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/campaigns/[id]/fields
 * Create/replace all application fields for a campaign.
 * Body: { fields: [{ type, question_text, description?, order, required, options? }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return createAuthResponse(authResult.error || 'Unauthorized', authResult.status || 401);
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { fields } = body;

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'fields array is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify campaign exists
    const { data: campaign, error: campError } = await tq
      .from('crm_campaigns')
      .select('id')
      .eq('id', id)
      .single();

    if (campError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Delete existing fields for this campaign
    const { error: deleteError } = await tq
      .from('programme_application_fields')
      .delete()
      .eq('campaign_id', id);

    if (deleteError) {
      console.error('Campaign Fields POST: Delete error', deleteError);
      return NextResponse.json({ error: 'Failed to clear existing fields' }, { status: 500 });
    }

    // Insert new fields
    const fieldsToInsert = fields.map((field: any, index: number) => ({
      campaign_id: id,
      type: field.type,
      question_text: field.question_text,
      description: field.description || null,
      order: field.order !== undefined ? field.order : index,
      required: field.required !== undefined ? field.required : true,
      options: field.options || null,
    }));

    const { data: insertedFields, error: insertError } = await tq
      .from('programme_application_fields')
      .insert(fieldsToInsert)
      .select();

    if (insertError) {
      console.error('Campaign Fields POST: Insert error', insertError);
      return NextResponse.json({ error: 'Failed to create fields' }, { status: 500 });
    }

    return NextResponse.json({ fields: insertedFields || [] });
  } catch (error: any) {
    console.error('Campaign Fields POST: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
