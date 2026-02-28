/**
 * LTI 1.3 OAuth 2.0 Implementation
 * Handles OAuth flows for LTI tool authentication
 */

import jwt from 'jsonwebtoken';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getLTITool } from './core';

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Handle OAuth 2.0 token request from LTI tool
 */
export async function handleTokenRequest(
  grant_type: string,
  client_id: string,
  client_assertion_type?: string,
  client_assertion?: string,
  scope?: string
): Promise<OAuthTokenResponse> {
  // Validate grant type
  if (grant_type !== 'client_credentials') {
    throw new Error('Invalid grant_type. Only client_credentials is supported.');
  }

  // Get tool
  const tool = await getLTITool(client_id);
  if (!tool) {
    throw new Error('Invalid client_id');
  }

  // Validate client assertion (JWT)
  if (client_assertion_type !== 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer') {
    throw new Error('Invalid client_assertion_type');
  }

  if (!client_assertion) {
    throw new Error('client_assertion is required');
  }

  // Verify client assertion JWT
  // In production, you should verify the JWT signature using the tool's public key
  // For now, we'll do basic validation
  try {
    const decoded = jwt.decode(client_assertion, { complete: true });

    if (!decoded || typeof decoded.payload === 'string') {
      throw new Error('Invalid client assertion');
    }

    if (decoded.payload.iss !== client_id || decoded.payload.sub !== client_id) {
      throw new Error('Invalid client assertion');
    }

    // Check expiration
    if (decoded.payload.exp && decoded.payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Client assertion expired');
    }
  } catch (error) {
    throw new Error('Invalid client assertion JWT');
  }

  // Generate access token
  const { generateAccessToken } = await import('./core');
  const accessToken = await generateAccessToken(tool.id, scope ? scope.split(' ') : []);

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: scope || '',
  };
}

/**
 * Validate OAuth access token
 */
export async function validateAccessToken(token: string): Promise<{ tool_id: string; scopes: string[] } | null> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('lti_access_tokens')
    .select('tool_id, scope, expires_at')
    .eq('access_token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!data) {
    return null;
  }

  return {
    tool_id: data.tool_id,
    scopes: data.scope ? data.scope.split(' ') : [],
  };
}

