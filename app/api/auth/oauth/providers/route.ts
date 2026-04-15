import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * Public endpoint: returns enabled OAuth providers for the current tenant.
 * Used by the login page to render OAuth sign-in buttons.
 * No authentication required. No secrets exposed.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from('oauth_providers')
      .select('provider_type, display_name, button_label, button_icon')
      .eq('tenant_id', tenantId)
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching public OAuth providers:', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('OAuth providers public GET error:', error);
    return NextResponse.json([]);
  }
}
