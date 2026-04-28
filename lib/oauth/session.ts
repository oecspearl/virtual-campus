import crypto from 'crypto';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { ensureUserExists } from '@/lib/user-provisioning';
import type { OAuthUserInfo, OAuthProviderType } from './types';

interface OAuthSessionResult {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

interface CreateOAuthSessionOptions {
  userInfo: OAuthUserInfo;
  tenantId: string;
  providerType: OAuthProviderType;
  defaultRole?: string;
  autoProvisionUsers?: boolean;
}

/**
 * Create or find a Supabase Auth user for an OAuth-authenticated user,
 * link the IdP-issued `sub` to that user, then ensure their LMS profile
 * and tenant membership exist.
 *
 * Lookup order (see migration 040):
 *   1. user_oauth_identities row matching (provider_type, sub) — returning user
 *   2. users row matching lowercased email — first OAuth login for an existing
 *      account; link the identity to it
 *   3. neither — provision a new user (only if autoProvisionUsers is true)
 *
 * The IdP has already authenticated the user; session generation (the
 * Supabase magic link) is handled by the callback route.
 */
export async function createOAuthSession(
  options: CreateOAuthSessionOptions,
): Promise<OAuthSessionResult> {
  const { userInfo, tenantId, providerType, defaultRole = 'student', autoProvisionUsers = true } = options;
  const serviceSupabase = createServiceSupabaseClient();
  const email = userInfo.email.toLowerCase();
  const name = userInfo.name || userInfo.given_name || email.split('@')[0];
  const sub = userInfo.sub;

  if (!sub) {
    return { success: false, error: 'Identity provider did not return a subject claim' };
  }

  try {
    let userId: string | null = null;
    let identityExisted = false;

    // 1. Match on (provider_type, sub) — the canonical returning-user path.
    const { data: identityRow } = await serviceSupabase
      .from('user_oauth_identities')
      .select('user_id')
      .eq('provider_type', providerType)
      .eq('provider_subject', sub)
      .maybeSingle();

    if (identityRow?.user_id) {
      userId = identityRow.user_id;
      identityExisted = true;
    }

    // 2. Fall back to email match — first OAuth login for an existing account.
    if (!userId) {
      const { data: userByEmail } = await serviceSupabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);

      if (userByEmail && userByEmail.length > 0) {
        userId = userByEmail[0].id;
      }
    }

    // 3. Still nothing — JIT-provision a new user, only if the tenant allows it.
    if (!userId) {
      if (!autoProvisionUsers) {
        return {
          success: false,
          error: 'Your account is not registered. Contact your administrator.',
        };
      }

      const randomPassword = crypto.randomBytes(32).toString('base64');
      const { data: newAuthUser, error: createError } =
        await serviceSupabase.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            oauth_provider: providerType,
          },
        });

      if (createError || !newAuthUser.user) {
        console.error('OAuth: Failed to create Supabase auth user', createError?.message);
        return { success: false, error: 'Failed to create user account' };
      }

      userId = newAuthUser.user.id;
    }

    // Override defaultRole only when we are creating a brand-new LMS profile.
    // ensureUserExists currently always defaults to 'student' for new rows;
    // existing users keep their stored role.
    const provisionResult = await ensureUserExists(
      userId,
      email,
      { full_name: name },
      tenantId,
    );

    if (!provisionResult.success) {
      return { success: false, error: 'Failed to provision user profile' };
    }

    // Apply defaultRole on first-time provision if it differs from the default.
    if (provisionResult.created && defaultRole && defaultRole !== 'student') {
      await serviceSupabase
        .from('users')
        .update({ role: defaultRole })
        .eq('id', userId);

      await serviceSupabase
        .from('tenant_memberships')
        .update({ role: defaultRole })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);
    }

    // Link or refresh the OAuth identity row.
    const nowIso = new Date().toISOString();
    if (identityExisted) {
      await serviceSupabase
        .from('user_oauth_identities')
        .update({ email, last_login_at: nowIso })
        .eq('provider_type', providerType)
        .eq('provider_subject', sub);
    } else {
      await serviceSupabase
        .from('user_oauth_identities')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          provider_type: providerType,
          provider_subject: sub,
          email,
          last_login_at: nowIso,
        });
    }

    // Mark the provider record as healthy + bump last_used_at.
    await serviceSupabase
      .from('oauth_providers')
      .update({ last_used_at: nowIso, connection_status: 'connected' })
      .eq('tenant_id', tenantId)
      .eq('provider_type', providerType);

    return { success: true, userId, email };
  } catch (error) {
    console.error('OAuth session creation error', error);
    return { success: false, error: 'Internal error during OAuth session creation' };
  }
}
