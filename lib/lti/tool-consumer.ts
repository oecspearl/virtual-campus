/**
 * LTI Tool Consumer Core Functions
 * Handles receiving launches from external platforms
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { LTIJWTClaims } from './core';

export interface LTIExternalPlatform {
  id: string;
  name: string;
  issuer: string;
  client_id: string;
  deployment_id?: string;
  jwks_uri: string;
  platform_public_key?: string;
  auto_provision_users: boolean;
  default_user_role: string;
  status: string;
}

export interface JWK {
  kty: string;
  use?: string;
  kid: string;
  alg: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
}

export interface JWKS {
  keys: JWK[];
}

/**
 * Get external platform by issuer
 */
export async function getExternalPlatform(issuer: string): Promise<LTIExternalPlatform | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('lti_external_platforms')
    .select('*')
    .eq('issuer', issuer)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data as LTIExternalPlatform;
}

/**
 * Fetch JWKS from platform and cache keys
 */
export async function fetchAndCacheJWKS(platformId: string, jwksUri: string): Promise<Map<string, string>> {
  const supabase = createServiceSupabaseClient();
  
  try {
    // Fetch JWKS from platform
    const response = await fetch(jwksUri, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
    }

    const jwks: JWKS = await response.json();
    const keyMap = new Map<string, string>();

    // Process each key
    for (const key of jwks.keys) {
      if (key.kty === 'RSA' && key.n && key.e) {
        // Convert JWK to PEM format
        const publicKey = jwkToPEM(key);
        keyMap.set(key.kid, publicKey);

        // Cache in database
        await supabase
          .from('lti_platform_keys_cache')
          .upsert({
            platform_id: platformId,
            kid: key.kid,
            public_key: publicKey,
            algorithm: key.alg || 'RS256',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'platform_id,kid',
          });
      }
    }

    return keyMap;
  } catch (error) {
    console.error('[LTI Tool Consumer] Error fetching JWKS:', error);
    throw error;
  }
}

/**
 * Get cached public key for a platform
 */
export async function getCachedPublicKey(platformId: string, kid: string): Promise<string | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('lti_platform_keys_cache')
    .select('public_key')
    .eq('platform_id', platformId)
    .eq('kid', kid)
    .single();

  if (error || !data) {
    return null;
  }

  return data.public_key;
}

/**
 * Validate LTI JWT from external platform
 */
export async function validateExternalPlatformJWT(
  token: string,
  platform: LTIExternalPlatform
): Promise<LTIJWTClaims> {
  try {
    // Decode without verification first to get the kid
    const decoded = jwt.decode(token, { complete: true }) as any;
    
    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new Error('JWT missing kid in header');
    }

    const kid = decoded.header.kid;

    // Try to get cached key
    let publicKey = await getCachedPublicKey(platform.id, kid);

    // If not cached, fetch JWKS and try again
    if (!publicKey) {
      console.log(`[LTI Tool Consumer] Key ${kid} not cached, fetching JWKS...`);
      const keyMap = await fetchAndCacheJWKS(platform.id, platform.jwks_uri);
      publicKey = keyMap.get(kid) || null;
    }

    // Fallback to stored public key if available
    if (!publicKey && platform.platform_public_key) {
      publicKey = platform.platform_public_key;
    }

    if (!publicKey) {
      throw new Error(`Public key not found for kid: ${kid}`);
    }

    // Verify JWT
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: platform.client_id,
    }) as any;

    // Validate issuer
    if (verified.iss !== platform.issuer) {
      throw new Error(`Invalid issuer: expected ${platform.issuer}, got ${verified.iss}`);
    }

    // Validate deployment_id if provided
    const deploymentId = verified['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
    if (platform.deployment_id && deploymentId !== platform.deployment_id) {
      throw new Error(`Invalid deployment_id: expected ${platform.deployment_id}, got ${deploymentId}`);
    }

    return verified as LTIJWTClaims;
  } catch (error) {
    console.error('[LTI Tool Consumer] JWT validation error:', error);
    throw new Error(`Invalid LTI JWT: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Convert JWK to PEM format
 */
function jwkToPEM(jwk: JWK): string {
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    throw new Error('Only RSA keys are supported');
  }

  // Convert base64url to Buffer
  const n = Buffer.from(jwk.n, 'base64url');
  const e = Buffer.from(jwk.e, 'base64url');

  // Create RSA public key
  const publicKey = crypto.createPublicKey({
    key: {
      kty: 'RSA',
      n: jwk.n,
      e: jwk.e,
    },
    format: 'jwk',
  });

  // Export as PEM
  return publicKey.export({
    type: 'spki',
    format: 'pem',
  }) as string;
}

/**
 * Map LTI role to LMS role
 */
export function mapLTIRoleToLMSRole(ltiRoles: string[]): string {
  // Check for instructor/admin roles first
  for (const role of ltiRoles) {
    if (role.includes('Instructor') || role.includes('Administrator') || role.includes('ContentDeveloper')) {
      return 'instructor';
    }
  }

  // Default to student
  return 'student';
}

/**
 * Provision user from LTI claims
 */
export async function provisionUserFromLTI(claims: LTIJWTClaims, platform: LTIExternalPlatform): Promise<string> {
  const supabase = createServiceSupabaseClient();
  
  const email = claims.email;
  const name = claims.name || claims.given_name || email?.split('@')[0] || 'LTI User';
  const ltiUserId = claims.sub;
  const role = mapLTIRoleToLMSRole(claims['https://purl.imsglobal.org/spec/lti/claim/roles'] || []);

  if (!email) {
    throw new Error('Email is required for user provisioning');
  }

  // Check if user exists by email
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single();

  if (existingUser) {
    return existingUser.id;
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: name,
      role: platform.default_user_role || role,
      lti_user_id: ltiUserId,
      lti_platform: platform.issuer,
    },
  });

  if (authError || !authData.user) {
    console.error('[LTI Tool Consumer] Error creating auth user:', authError);
    throw new Error(`Failed to create user: ${authError?.message || 'Unknown error'}`);
  }

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      name,
      role: platform.default_user_role || role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error('[LTI Tool Consumer] Error creating user profile:', profileError);
    // Try to clean up auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create user profile: ${profileError.message}`);
  }

  return authData.user.id;
}

/**
 * Find or create user from LTI claims
 */
export async function findOrCreateUserFromLTI(claims: LTIJWTClaims, platform: LTIExternalPlatform): Promise<string | null> {
  const supabase = createServiceSupabaseClient();
  
  if (!platform.auto_provision_users) {
    // Just find existing user
    const email = claims.email;
    if (!email) {
      return null;
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    return user?.id || null;
  }

  // Auto-provision user
  return await provisionUserFromLTI(claims, platform);
}

/**
 * Generate session token for LTI launch
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}



