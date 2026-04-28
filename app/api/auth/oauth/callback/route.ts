import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { validateState } from '@/lib/oauth/state';
import { exchangeCodeForTokens, getUserInfo, validateEmailDomain } from '@/lib/oauth/provider';
import { createOAuthSession } from '@/lib/oauth/session';
import { checkRateLimit } from '@/lib/rate-limit';
import type { OAuthProviderConfig } from '@/lib/oauth/types';

/**
 * Public endpoint: handles the OAuth callback from the identity provider.
 * Validates state, exchanges code for tokens, extracts user info,
 * JIT provisions the user, and redirects to the dashboard with a session.
 */
export async function GET(request: NextRequest) {
  const signinUrl = new URL('/auth/signin', request.url);

  try {
    // Rate limit: 10 callbacks per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`oauth-callback:${ip}`, 10, 60000)) {
      signinUrl.searchParams.set('error', 'too_many_requests');
      return NextResponse.redirect(signinUrl);
    }

    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const errorParam = request.nextUrl.searchParams.get('error');

    // Handle IdP-side errors (e.g., user cancelled)
    if (errorParam) {
      const errorDesc = request.nextUrl.searchParams.get('error_description') || errorParam;
      signinUrl.searchParams.set('error', errorDesc);
      return NextResponse.redirect(signinUrl);
    }

    if (!code || !stateParam) {
      signinUrl.searchParams.set('error', 'missing_params');
      return NextResponse.redirect(signinUrl);
    }

    // 1. Validate state (HMAC signature + expiry)
    const state = validateState(stateParam);
    if (!state) {
      signinUrl.searchParams.set('error', 'invalid_state');
      return NextResponse.redirect(signinUrl);
    }

    // 2. Retrieve the PKCE code_verifier from the httpOnly cookie
    const codeVerifier = request.cookies.get('oauth_code_verifier')?.value;
    if (!codeVerifier) {
      signinUrl.searchParams.set('error', 'missing_verifier');
      return NextResponse.redirect(signinUrl);
    }

    // 3. Look up the provider config
    const supabase = createServiceSupabaseClient();
    const { data: provider, error: providerError } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('tenant_id', state.tenant_id)
      .eq('provider_type', state.provider_type)
      .eq('enabled', true)
      .single();

    if (providerError || !provider) {
      signinUrl.searchParams.set('error', 'provider_not_found');
      return NextResponse.redirect(signinUrl);
    }

    const config = provider as OAuthProviderConfig;
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/oauth/callback`;

    // 4. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(config, code, redirectUri, codeVerifier);

    // 5. Get user info from tokens
    const userInfo = await getUserInfo(config, tokens);

    if (!userInfo.email) {
      signinUrl.searchParams.set('error', 'no_email');
      return NextResponse.redirect(signinUrl);
    }

    // 6. Validate email domain restriction
    if (!validateEmailDomain(userInfo.email, config.email_domain_restriction)) {
      signinUrl.searchParams.set('error', 'email_domain_not_allowed');
      return NextResponse.redirect(signinUrl);
    }

    // 7. Create or find Supabase user + LMS profile (JIT provisioning)
    const sessionResult = await createOAuthSession({
      userInfo,
      tenantId: state.tenant_id,
      providerType: state.provider_type,
      defaultRole: config.default_role,
      autoProvisionUsers: config.auto_provision_users,
    });

    if (!sessionResult.success || !sessionResult.email) {
      signinUrl.searchParams.set('error', sessionResult.error || 'session_failed');
      return NextResponse.redirect(signinUrl);
    }

    // 8. Generate a magic link to create a valid Supabase session cookie
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: sessionResult.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('OAuth: Failed to generate magic link', linkError);
      signinUrl.searchParams.set('error', 'session_failed');
      return NextResponse.redirect(signinUrl);
    }

    // Redirect through the Supabase auth callback to set the session cookie
    // The token_hash + type=magiclink will be handled by Supabase to establish the session
    const verifyUrl = new URL('/auth/callback', request.url);
    verifyUrl.searchParams.set('token_hash', linkData.properties.hashed_token);
    verifyUrl.searchParams.set('type', 'magiclink');
    verifyUrl.searchParams.set('next', '/dashboard');

    const response = NextResponse.redirect(verifyUrl);

    // Clear the PKCE cookie
    response.cookies.delete('oauth_code_verifier');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    signinUrl.searchParams.set('error', 'oauth_callback_failed');
    return NextResponse.redirect(signinUrl);
  }
}
