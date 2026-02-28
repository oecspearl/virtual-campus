import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createSonisWebClient } from './client';
import type { SonisWebConnection } from './types';

/**
 * Get the SonisWeb connection configured for SSO passthrough for a tenant.
 */
export async function getSSOConnection(tenantId: string): Promise<SonisWebConnection | null> {
  const supabase = createServiceSupabaseClient();

  const { data } = await supabase
    .from('sonisweb_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('auth_flow', 'sso_passthrough')
    .eq('connection_status', 'connected')
    .limit(1)
    .single();

  return data as SonisWebConnection | null;
}

/**
 * Validate credentials against SonisWeb for SSO passthrough.
 * Attempts to authenticate the user by calling SonisWeb's security API
 * or by testing a SQL query with the user's credentials.
 */
export async function validateSonisWebCredentials(
  email: string,
  password: string,
  tenantId: string
): Promise<{
  valid: boolean;
  studentData?: Record<string, any>;
  soniswebId?: string;
  error?: string;
}> {
  try {
    const connection = await getSSOConnection(tenantId);
    if (!connection) {
      return { valid: false, error: 'No SSO connection configured for this tenant' };
    }

    const client = createSonisWebClient(connection);

    // Try to validate via SonisWeb API
    // The exact CFC component/method depends on the institution's SonisWeb version
    const result = await client.callApi('CFC.security', 'validateUser', {
      username: email,
      password: password,
    });

    if (result.success && result.data.length > 0) {
      const userData = result.data[0];
      // Check for valid response (non-empty user data)
      if (userData && (userData.soc_sec || userData.st_id || userData.valid === 'true')) {
        return {
          valid: true,
          studentData: userData,
          soniswebId: userData.soc_sec || userData.st_id,
        };
      }
    }

    // Fallback: try to look up student by email and validate
    // This is a read-only check — we find the student by email
    const sqlResult = await client.executeSql(
      `SELECT soc_sec, nm_first, nm_last, e_mail FROM name WHERE e_mail = '${email.replace(/'/g, "''")}'`
    );

    if (sqlResult.success && sqlResult.data.length > 0) {
      // Student exists in SonisWeb — try API validation
      const studentRecord = sqlResult.data[0];
      // If we can find the student, validate their password via API
      const authResult = await client.callApi('CFC.security', 'login', {
        username: studentRecord.soc_sec || email,
        password: password,
      });

      if (authResult.success) {
        return {
          valid: true,
          studentData: studentRecord,
          soniswebId: studentRecord.soc_sec || studentRecord.st_id,
        };
      }
    }

    return { valid: false, error: 'Invalid credentials' };
  } catch (err: any) {
    console.error('SonisWeb credential validation error:', err);
    return { valid: false, error: err.message || 'Validation failed' };
  }
}

/**
 * Find or create an LMS user for SSO passthrough.
 * Used during just-in-time provisioning when a user validates against SonisWeb
 * but doesn't have an LMS account yet.
 */
export async function findOrCreateSSOUser(
  email: string,
  studentData: Record<string, any>,
  soniswebId: string,
  tenantId: string,
  connectionId: string
): Promise<{ userId: string; isNew: boolean }> {
  const supabase = createServiceSupabaseClient();

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    // Ensure tenant membership exists
    await supabase
      .from('tenant_memberships')
      .upsert({
        tenant_id: tenantId,
        user_id: existingUser.id,
        role: 'student',
        is_primary: false,
      }, { onConflict: 'tenant_id,user_id' });

    // Ensure ID mapping exists
    await supabase
      .from('sonisweb_id_mappings')
      .upsert({
        tenant_id: tenantId,
        connection_id: connectionId,
        entity_type: 'user',
        sonisweb_id: soniswebId,
        lms_id: existingUser.id,
        sonisweb_data: studentData,
        sync_direction: 'pull',
      }, { onConflict: 'connection_id,entity_type,sonisweb_id' });

    return { userId: existingUser.id, isNew: false };
  }

  // Create new user (JIT provisioning)
  const name = [studentData.nm_first, studentData.nm_last].filter(Boolean).join(' ') || email.split('@')[0];

  // Generate random password (user authenticates via SonisWeb, not this password)
  const randomPassword = Array.from(
    { length: 16 },
    () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'[
      Math.floor(Math.random() * 67)
    ]
  ).join('');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { full_name: name, role: 'student' },
  });

  if (authError) throw new Error(`Auth creation failed: ${authError.message}`);

  const userId = authData.user.id;

  // Create user record
  await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      name,
      role: 'student',
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  // Create profile
  await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      bio: '',
      avatar: null,
      learning_preferences: {},
    });

  // Create tenant membership
  await supabase
    .from('tenant_memberships')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role: 'student',
      is_primary: true,
    });

  // Create ID mapping
  await supabase
    .from('sonisweb_id_mappings')
    .insert({
      tenant_id: tenantId,
      connection_id: connectionId,
      entity_type: 'user',
      sonisweb_id: soniswebId,
      lms_id: userId,
      sonisweb_data: studentData,
      sync_direction: 'pull',
    });

  return { userId, isNew: true };
}
