import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/campaigns
 * List campaigns. Query params: status, search, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('crm_campaigns')
      .select('*, users!crm_campaigns_created_by_fkey(name), crm_segments(name)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('CRM Campaigns: Fetch error', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    const campaigns = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      subject: row.subject,
      segment_id: row.segment_id,
      segment_name: row.crm_segments?.name || null,
      status: row.status,
      scheduled_for: row.scheduled_for,
      sent_at: row.sent_at,
      created_by: row.created_by,
      created_by_name: row.users?.name || null,
      stats: row.stats,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ campaigns, total: count || 0, page });
  } catch (error: any) {
    console.error('CRM Campaigns: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/campaigns
 * Create a new campaign.
 * Body: { name, subject, body_html, body_text?, segment_id, scheduled_for?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, body_html, body_text, segment_id, scheduled_for, metadata } = body;

    if (!name || !subject || !body_html) {
      return NextResponse.json({ error: 'name, subject, and body_html are required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const status = scheduled_for ? 'scheduled' : 'draft';

    const { data, error } = await tq
      .from('crm_campaigns')
      .insert({
        name,
        subject,
        body_html,
        body_text: body_text || null,
        segment_id: segment_id || null,
        status,
        scheduled_for: scheduled_for || null,
        created_by: authResult.userProfile.id,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('CRM Campaigns: Create error', error);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaign: data });
  } catch (error: any) {
    console.error('CRM Campaigns: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
