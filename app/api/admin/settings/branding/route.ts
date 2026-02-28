import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

// GET - Fetch all branding settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin', 'curriculum_designer'])) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request, authResult.userProfile.role);
    const tq = createTenantQuery(tenantId);

    // Fetch all branding settings
    const { data: settings, error } = await tq
      .from('site_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('Error fetching branding settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Convert array to object for easier access
    const settingsObj: Record<string, any> = {};
    settings?.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        type: setting.setting_type,
        description: setting.description
      };
    });

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error('Branding settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update branding settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin', 'curriculum_designer'])) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request, authResult.userProfile.role);
    const tq = createTenantQuery(tenantId);

    // Update each setting
    const updates = Object.entries(settings).map(([key, valueObj]: [string, any]) => {
      return tq
        .from('site_settings')
        .upsert({
          setting_key: key,
          setting_value: typeof valueObj === 'object' ? valueObj.value : valueObj,
          setting_type: valueObj?.type || 'text',
          description: valueObj?.description,
          updated_by: authResult.user?.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id,setting_key'
        });
    });

    await Promise.all(updates);

    // Fetch updated settings
    const { data: updatedSettings } = await tq
      .from('site_settings')
      .select('*')
      .order('setting_key');

    const settingsObj: Record<string, any> = {};
    updatedSettings?.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        type: setting.setting_type,
        description: setting.description
      };
    });

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      settings: settingsObj 
    });
  } catch (error) {
    console.error('Branding settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

