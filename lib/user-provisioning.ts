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
 * Ensures a user exists in the `users` table and has a `tenant_membership`.
 * If the user doesn't exist, creates both records with default student role.
 *
 * Uses the service client to bypass RLS (prevents infinite recursion on the users table).
 */
export async function ensureUserExists(
  userId: string,
  email: string,
  metadata: { full_name?: string; name?: string },
  tenantId: string,
): Promise<ProvisionResult> {
  const serviceSupabase = createServiceSupabaseClient();

  // Check if user already exists
  const { data: existingProfile, error: lookupError } = await serviceSupabase
    .from('users')
    .select('id, email, name, role, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (existingProfile && !lookupError) {
    return { success: true, userProfile: existingProfile, created: false };
  }

  // Create user in our database
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

  // Create tenant membership for the new user
  await serviceSupabase
    .from('tenant_memberships')
    .insert([{
      tenant_id: tenantId,
      user_id: userId,
      role: 'student',
      is_primary: true,
    }]);

  console.log('User provisioning: Created user with tenant membership', { userId, tenantId });
  return { success: true, userProfile: createdUser, created: true };
}
