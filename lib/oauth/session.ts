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

/**
 * Create or find a Supabase Auth user for an OAuth-authenticated user,
 * then ensure their LMS profile and tenant membership exist.
 *
 * This mirrors the SonisWeb SSO passthrough pattern: the identity provider
 * has already authenticated the user, so we create/find a Supabase user.
 * Session generation (magic link) is handled by the callback route.
 */
export async function createOAuthSession(
  userInfo: OAuthUserInfo,
  tenantId: string,
  providerType: OAuthProviderType,
  defaultRole: string = 'student',
): Promise<OAuthSessionResult> {
  const serviceSupabase = createServiceSupabaseClient();
  const email = userInfo.email.toLowerCase();
  const name = userInfo.name || userInfo.given_name || email.split('@')[0];

  try {
    let userId: string | null = null;

    // 1. Check if user already exists in our users table
    const { data: userList } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (userList && userList.length > 0) {
      userId = userList[0].id;
    }

    // 2. If user doesn't exist, create in Supabase Auth
    if (!userId) {
      const randomPassword = crypto.randomBytes(32).toString('base64');

      const { data: newAuthUser, error: createError } = await serviceSupabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          oauth_provider: providerType,
        },
      });

      if (createError || !newAuthUser.user) {
        console.error('OAuth: Failed to create Supabase auth user');
        return { success: false, error: 'Failed to create user account' };
      }

      userId = newAuthUser.user.id;
    }

    // 3. Ensure LMS profile + tenant membership exist (JIT provisioning)
    const provisionResult = await ensureUserExists(
      userId,
      email,
      { full_name: name },
      tenantId,
    );

    if (!provisionResult.success) {
      return { success: false, error: 'Failed to provision user profile' };
    }

    // 4. Update last_used_at on the oauth_providers record
    await serviceSupabase
      .from('oauth_providers')
      .update({ last_used_at: new Date().toISOString(), connection_status: 'connected' })
      .eq('tenant_id', tenantId)
      .eq('provider_type', providerType);

    return {
      success: true,
      userId,
      email,
    };
  } catch (error) {
    console.error('OAuth session creation error');
    return { success: false, error: 'Internal error during OAuth session creation' };
  }
}
