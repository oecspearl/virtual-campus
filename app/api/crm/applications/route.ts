import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/applications
 * Admin: list programme applications with filters and pagination.
 * Query params: status, programme_id, campaign_id, search, page (default 1), limit (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return createAuthResponse(authResult.error || 'Unauthorized', authResult.status || 401);
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const programmeId = searchParams.get('programme_id');
    const campaignId = searchParams.get('campaign_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Build the applications query
    let query = tq
      .from('programme_applications')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (programmeId) {
      query = query.eq('programme_id', programmeId);
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (search) {
      query = query.or(
        `applicant_name.ilike.%${search}%,applicant_email.ilike.%${search}%`
      );
    }

    const { data: applications, count, error } = await query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('CRM Applications GET: Error', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    const appList = applications || [];

    // Collect unique programme_ids and campaign_ids for joining
    const programmeIds = [...new Set(appList.map((a: any) => a.programme_id).filter(Boolean))];
    const campaignIds = [...new Set(appList.map((a: any) => a.campaign_id).filter(Boolean))];

    // Fetch programme titles
    let programmeMap: Record<string, string> = {};
    if (programmeIds.length > 0) {
      const { data: programmes } = await tq
        .from('programmes')
        .select('id, title')
        .in('id', programmeIds);

      if (programmes) {
        programmeMap = Object.fromEntries(
          programmes.map((p: any) => [p.id, p.title])
        );
      }
    }

    // Fetch campaign names
    let campaignMap: Record<string, string> = {};
    if (campaignIds.length > 0) {
      const { data: campaigns } = await tq
        .from('crm_campaigns')
        .select('id, name')
        .in('id', campaignIds);

      if (campaigns) {
        campaignMap = Object.fromEntries(
          campaigns.map((c: any) => [c.id, c.name])
        );
      }
    }

    // Enrich applications with programme_title and campaign_name
    const enrichedApplications = appList.map((app: any) => ({
      ...app,
      programme_title: programmeMap[app.programme_id] || null,
      campaign_name: campaignMap[app.campaign_id] || null,
    }));

    // Calculate status counts if filtered by campaign_id (useful for campaign detail page)
    let statusCounts: Record<string, number> | undefined;
    if (campaignId) {
      const { data: allForCampaign } = await tq
        .from('programme_applications')
        .select('status')
        .eq('campaign_id', campaignId);

      if (allForCampaign) {
        statusCounts = {};
        for (const a of allForCampaign) {
          statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        }
      }

      // Also get the programme title for the campaign
      const { data: campaign } = await tq
        .from('crm_campaigns')
        .select('metadata')
        .eq('id', campaignId)
        .single();

      if (campaign?.metadata?.programme_id) {
        const { data: prog } = await tq
          .from('programmes')
          .select('title')
          .eq('id', campaign.metadata.programme_id)
          .single();

        if (prog) {
          return NextResponse.json({
            applications: enrichedApplications,
            total: count || 0,
            page,
            status_counts: statusCounts,
            programme_title: prog.title,
          });
        }
      }
    }

    return NextResponse.json({
      applications: enrichedApplications,
      total: count || 0,
      page,
      status_counts: statusCounts,
    });
  } catch (error: any) {
    console.error('CRM Applications GET: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
