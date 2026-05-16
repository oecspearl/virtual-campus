import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getTenantIdFromRequest } from '@/lib/tenant-query';
import { createLogger } from '@/lib/logger';

/**
 * Public endpoint: returns enabled OAuth providers for the current tenant.
 * Used by the login page to render OAuth sign-in buttons.
 * No authentication required. No secrets exposed.
 */
export async function GET(request: NextRequest) {
  const log = createLogger('api/auth/oauth/providers', request);
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
      log.error('Failed to fetch OAuth providers', undefined, error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    log.error('GET handler crashed', undefined, error);
    return NextResponse.json([]);
  }
}
