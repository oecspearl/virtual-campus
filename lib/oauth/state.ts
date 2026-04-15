import crypto from 'crypto';
import type { OAuthState, OAuthProviderType } from './types';

const STATE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function getStateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.SONISWEB_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('OAUTH_STATE_SECRET or SONISWEB_ENCRYPTION_KEY environment variable is required');
  }
  return secret;
}

/** Sign a state payload with HMAC-SHA256. */
function signPayload(payload: string): string {
  return crypto
    .createHmac('sha256', getStateSecret())
    .update(payload)
    .digest('hex');
}

/** Generate a signed OAuth state parameter. */
export function generateState(tenantId: string, providerType: OAuthProviderType): string {
  const state: OAuthState = {
    tenant_id: tenantId,
    nonce: crypto.randomBytes(16).toString('hex'),
    provider_type: providerType,
    timestamp: Date.now(),
  };
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

/** Validate and decode a signed OAuth state parameter. Returns null if invalid or expired. */
export function validateState(stateParam: string): OAuthState | null {
  const parts = stateParam.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expectedSignature = signPayload(payload);

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
    return null;
  }

  try {
    const state: OAuthState = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() - state.timestamp > STATE_EXPIRY_MS) {
      return null; // Expired
    }
    return state;
  } catch {
    return null;
  }
}

/** Generate a PKCE code_verifier and code_challenge (S256). */
export function generatePKCE(): { code_verifier: string; code_challenge: string } {
  const code_verifier = crypto.randomBytes(32).toString('base64url');
  const code_challenge = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');
  return { code_verifier, code_challenge };
}
