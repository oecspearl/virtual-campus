import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

// GET - Fetch tenant-specific settings (site_settings scoped to this tenant)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin', 'tenant_admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { id: tenantId } = await params;
    const serviceSupabase = createServiceSupabaseClient();

    // Verify tenant exists
    const { data: tenant } = await serviceSupabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Fetch site_settings for this tenant
    const { data: settings, error } = await serviceSupabase
      .from('site_settings')
      .select('setting_key, setting_value, setting_type, description')
      .eq('tenant_id', tenantId)
      .order('setting_key');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    const settingsObj: Record<string, { value: string; type: string; description: string | null }> = {};
    settings?.forEach(s => {
      settingsObj[s.setting_key] = {
        value: s.setting_value || '',
        type: s.setting_type || 'text',
        description: s.description,
      };
    });

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error('Tenant settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update tenant-specific settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin', 'tenant_admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { id: tenantId } = await params;
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object is required' }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Verify tenant exists
    const { data: tenant } = await serviceSupabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Upsert each setting
    const upserts = Object.entries(settings).map(([key, valObj]: [string, any]) => {
      return serviceSupabase
        .from('site_settings')
        .upsert(
          {
            tenant_id: tenantId,
            setting_key: key,
            setting_value: typeof valObj === 'object' ? valObj.value : valObj,
            setting_type: valObj?.type || 'text',
            description: valObj?.description,
          },
          { onConflict: 'tenant_id,setting_key' }
        );
    });

    const results = await Promise.all(upserts);
    const failed = results.find(r => r.error);
    if (failed?.error) {
      return NextResponse.json({ error: 'Failed to update some settings' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Tenant settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
