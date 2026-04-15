import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/campaigns/[id]
 * Get campaign details + recipients.
 * Query params: include_recipients (default true), page, limit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeRecipients = searchParams.get('include_recipients') !== 'false';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: campaign, error: campError } = await tq
      .from('crm_campaigns')
      .select('*, users!crm_campaigns_created_by_fkey(name), crm_segments(name)')
      .eq('id', id)
      .single();

    if (campError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let recipients: any[] = [];
    let recipientTotal = 0;

    if (includeRecipients) {
      const { data: recData, count, error: recError } = await tq
        .from('crm_campaign_recipients')
        .select('*, users!crm_campaign_recipients_student_id_fkey(name)', { count: 'exact' })
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!recError && recData) {
        recipients = recData.map((r: any) => ({
          id: r.id,
          student_id: r.student_id,
          student_name: r.users?.name || 'Unknown',
          email: r.email,
          status: r.status,
          sent_at: r.sent_at,
          opened_at: r.opened_at,
          clicked_at: r.clicked_at,
          error_message: r.error_message,
        }));
        recipientTotal = count || 0;
      }
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        body_html: campaign.body_html,
        body_text: campaign.body_text,
        segment_id: campaign.segment_id,
        segment_name: campaign.crm_segments?.name || null,
        status: campaign.status,
        scheduled_for: campaign.scheduled_for,
        sent_at: campaign.sent_at,
        created_by: campaign.created_by,
        created_by_name: campaign.users?.name || null,
        stats: campaign.stats,
        metadata: campaign.metadata,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
      },
      recipients,
      recipient_total: recipientTotal,
      page,
    });
  } catch (error: any) {
    console.error('CRM Campaign Detail: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/crm/campaigns/[id]
 * Update a draft/scheduled campaign.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: existing } = await tq
      .from('crm_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!['draft', 'scheduled'].includes(existing.status)) {
      return NextResponse.json({ error: 'Cannot edit a campaign that has been sent or is sending' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.subject !== undefined) updates.subject = body.subject;
    if (body.body_html !== undefined) updates.body_html = body.body_html;
    if (body.body_text !== undefined) updates.body_text = body.body_text;
    if (body.segment_id !== undefined) updates.segment_id = body.segment_id;
    if (body.scheduled_for !== undefined) {
      updates.scheduled_for = body.scheduled_for;
      updates.status = body.scheduled_for ? 'scheduled' : 'draft';
    }
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const { data, error } = await tq
      .from('crm_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('CRM Campaign Update: Error', error);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaign: data });
  } catch (error: any) {
    console.error('CRM Campaign Update: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/campaigns/[id]
 * Delete a campaign (only draft/scheduled).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: existing } = await tq
      .from('crm_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (['sent', 'sending'].includes(existing.status)) {
      return NextResponse.json({ error: 'Cannot delete a sent campaign' }, { status: 400 });
    }

    const { error } = await tq
      .from('crm_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('CRM Campaign Delete: Error', error);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('CRM Campaign Delete: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
