import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/engagement/config
 * Get the active engagement scoring configuration.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data, error } = await tq
      .from('crm_engagement_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('CRM Engagement Config: Fetch error', error);
      return NextResponse.json({ error: 'No active configuration found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('CRM Engagement Config: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/crm/engagement/config
 * Update the engagement scoring weights.
 * Body: { weights: { login_frequency, lesson_completion_rate, ... } }
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { weights } = body;

    if (!weights || typeof weights !== 'object') {
      return NextResponse.json({ error: 'weights object is required' }, { status: 400 });
    }

    // Validate weights sum to ~1.0
    const totalWeight = Object.values(weights as Record<string, number>).reduce((sum, w) => sum + (Number(w) || 0), 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return NextResponse.json({ error: `Weights must sum to 1.0 (currently ${totalWeight.toFixed(2)})` }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Deactivate existing configs
    await tq
      .from('crm_engagement_config')
      .update({ is_active: false })
      .eq('is_active', true);

    // Create new active config
    const { data, error } = await tq
      .from('crm_engagement_config')
      .insert({
        config_name: 'custom',
        weights,
        is_active: true,
        created_by: authResult.userProfile.id,
      })
      .select()
      .single();

    if (error) {
      console.error('CRM Engagement Config: Update error', error);
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error: any) {
    console.error('CRM Engagement Config: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
