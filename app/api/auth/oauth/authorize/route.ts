import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getTenantIdFromRequest } from '@/lib/tenant-query';
import { generateState, generatePKCE } from '@/lib/oauth/state';
import { buildAuthorizationUrl } from '@/lib/oauth/provider';
import { checkRateLimit } from '@/lib/rate-limit';
import type { OAuthProviderConfig } from '@/lib/oauth/types';

/**
 * Public endpoint: initiates the OAuth authorization code flow.
 * Generates state + PKCE, stores code_verifier in an httpOnly cookie,
 * and redirects to the identity provider.
 *
 * Usage: GET /api/auth/oauth/authorize?provider=azure_ad
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 10 attempts per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`oauth-authorize:${ip}`, 10, 60000)) {
      return NextResponse.redirect(new URL('/auth/signin?error=too_many_requests', request.url));
    }

    const providerType = request.nextUrl.searchParams.get('provider');
    if (!providerType) {
      return NextResponse.redirect(new URL('/auth/signin?error=missing_provider', request.url));
    }

    const tenantId = getTenantIdFromRequest(request);
    const supabase = createServiceSupabaseClient();

    // Look up the enabled provider for this tenant
    const { data: provider, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider_type', providerType)
      .eq('enabled', true)
      .single();

    if (error || !provider) {
      return NextResponse.redirect(new URL('/auth/signin?error=provider_not_found', request.url));
    }

    const config = provider as OAuthProviderConfig;

    // Generate state (signed, includes tenant_id) and PKCE
    const state = generateState(tenantId, config.provider_type);
    const { code_verifier, code_challenge } = generatePKCE();

    // Build the callback URL
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/oauth/callback`;

    // Build the authorization URL
    const authUrl = buildAuthorizationUrl(config, redirectUri, state, code_challenge);

    // Create redirect response and set PKCE code_verifier in an httpOnly cookie
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('oauth_code_verifier', code_verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/oauth/callback',
      maxAge: 300, // 5 minutes
    });

    return response;
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=oauth_error', request.url));
  }
}
