import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Public GET endpoint - Fetch branding settings for display (no auth required)
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || DEFAULT_TENANT_ID;
    const serviceSupabase = createServiceSupabaseClient();

    // Fetch branding settings scoped to the current tenant
    const { data: settings, error } = await serviceSupabase
      .from('site_settings')
      .select('setting_key, setting_value, setting_type')
      .eq('tenant_id', tenantId)
      .order('setting_key');

    if (error) {
      console.error('Error fetching branding settings:', error);
      // Return defaults if database query fails
      return NextResponse.json({
        settings: {
          site_name: { value: 'OECS MyPD' },
          site_short_name: { value: 'MyPD' },
          logo_url: { value: '/mypdlogo.png' },
          logo_header_url: { value: '/Logo.png' },
          homepage_header_background: { value: '/oecsmypd.png' }
        }
      });
    }

    // Convert array to object for easier access
    const settingsObj: Record<string, { value: string }> = {};
    settings?.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value || ''
      };
    });

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error('Branding settings GET error:', error);
    // Return defaults on error
    return NextResponse.json({
      settings: {
        site_name: { value: 'OECS MyPD' },
        site_short_name: { value: 'MyPD' },
        logo_url: { value: '/mypdlogo.png' },
        logo_header_url: { value: '/Logo.png' },
        homepage_header_background: { value: '/oecsmypd.png' }
      }
    });
  }
}
