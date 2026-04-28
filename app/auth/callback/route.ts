import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Verify a Supabase magic-link token and establish a session, then redirect.
 *
 * Called by /api/auth/oauth/callback after JIT-provisioning the user. The OAuth
 * flow generates a magic link via supabase.auth.admin.generateLink and hands the
 * token_hash here so this route can call verifyOtp — which writes the sb-* auth
 * cookies through the @supabase/ssr cookie handler.
 *
 * Also acts as the generic Supabase email-confirmation/recovery callback.
 *
 * Query params:
 *   - token_hash: required — the hashed token from the magic link
 *   - type:       required — magiclink | signup | recovery | invite | email_change
 *   - next:       optional — destination after success (default /dashboard)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as
    | 'magiclink' | 'signup' | 'recovery' | 'invite' | 'email_change' | null;
  const next = url.searchParams.get('next') || '/dashboard';

  const errorRedirect = (code: string) => {
    const signin = new URL('/auth/signin', request.url);
    signin.searchParams.set('error', code);
    return NextResponse.redirect(signin);
  };

  if (!token_hash || !type) {
    return errorRedirect('missing_params');
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (error) {
      console.error('Auth callback: verifyOtp failed', error.message);
      return errorRedirect('session_failed');
    }

    // Resolve `next` against the request origin to prevent open-redirects.
    const dest = new URL(next.startsWith('/') ? next : `/${next}`, request.url);
    if (dest.origin !== url.origin) {
      // Reject any attempt to redirect off-site
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.redirect(dest);
  } catch (err) {
    console.error('Auth callback: unexpected error', err);
    return errorRedirect('session_failed');
  }
}
