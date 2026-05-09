import { createServiceSupabaseClient } from './supabase-server';

interface ProvisionedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export type ProvisionResult =
  | { success: true; userProfile: ProvisionedUser; created: boolean }
  | { success: false; error: string };

/**
 * Ensures a user exists in the `users` table and has a `tenant_memberships`
 * row in the supplied tenant. If the user doesn't exist, creates the users
 * row with the default student role.
 *
 * Uses the service client to bypass RLS (prevents infinite recursion on the
 * users table).
 *
 * The membership step runs on EVERY call, not just first-provision, and
 * upserts with onConflict so it's idempotent. This self-heals users created
 * through earlier code paths where the membership insert silently failed
 * (the previous version awaited the insert without checking its result).
 * Without a membership row, panels that join through tenant_memberships
 * render the user as "Unknown User."
 */
export async function ensureUserExists(
  userId: string,
  email: string,
  metadata: { full_name?: string; name?: string },
  tenantId: string,
): Promise<ProvisionResult> {
  const serviceSupabase = createServiceSupabaseClient();

  let userProfile: ProvisionedUser;
  let created = false;

  const { data: existingProfile, error: lookupError } = await serviceSupabase
    .from('users')
    .select('id, email, name, role, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (existingProfile && !lookupError) {
    userProfile = existingProfile;
  } else {
    const now = new Date().toISOString();
    const newUser = {
      id: userId,
      email: email || '',
      name: (metadata?.full_name || metadata?.name || '') as string,
      role: 'student',
      tenant_id: tenantId,
      created_at: now,
      updated_at: now,
    };

    const { data: createdUser, error: createError } = await serviceSupabase
      .from('users')
      .insert([newUser])
      .select('id, email, name, role, created_at, updated_at')
      .single();

    if (createError || !createdUser) {
      console.error('User provisioning: Failed to create user', createError);
      return { success: false, error: 'Failed to create user profile' };
    }

    userProfile = createdUser;
    created = true;
  }

  const { error: membershipError } = await serviceSupabase
    .from('tenant_memberships')
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role: userProfile.role || 'student',
        is_primary: true,
      },
      { onConflict: 'tenant_id,user_id', ignoreDuplicates: true },
    );

  if (membershipError) {
    console.error('User provisioning: Failed to ensure tenant_membership', {
      userId,
      tenantId,
      error: membershipError,
    });
  }

  if (created) {
    console.log('User provisioning: Created user with tenant membership', {
      userId,
      tenantId,
    });
  }

  return { success: true, userProfile, created };
}
