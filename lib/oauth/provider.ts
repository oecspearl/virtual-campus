import type {
  OAuthProviderConfig,
  OAuthEndpoints,
  OAuthTokenResponse,
  OAuthUserInfo,
} from './types';
import { decryptCredential } from '@/lib/sonisweb/client';

const FETCH_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Resolve the well-known OAuth/OIDC endpoints for a given provider.
 * Azure AD and Google have well-known URLs; generic OIDC uses stored values.
 */
export function getProviderEndpoints(config: OAuthProviderConfig): OAuthEndpoints {
  switch (config.provider_type) {
    case 'azure_ad': {
      const azureTenant = config.provider_tenant_id || 'common';
      const base = `https://login.microsoftonline.com/${azureTenant}/oauth2/v2.0`;
      return {
        authorization_url: config.authorization_url || `${base}/authorize`,
        token_url: config.token_url || `${base}/token`,
        userinfo_url: config.userinfo_url || 'https://graph.microsoft.com/oidc/userinfo',
        jwks_url: `https://login.microsoftonline.com/${azureTenant}/discovery/v2.0/keys`,
      };
    }
    case 'google':
      return {
        authorization_url: config.authorization_url || 'https://accounts.google.com/o/oauth2/v2/auth',
        token_url: config.token_url || 'https://oauth2.googleapis.com/token',
        userinfo_url: config.userinfo_url || 'https://openidconnect.googleapis.com/v1/userinfo',
        jwks_url: 'https://www.googleapis.com/oauth2/v3/certs',
      };
    case 'generic_oidc':
      if (!config.authorization_url || !config.token_url || !config.userinfo_url) {
        throw new Error('Generic OIDC provider requires authorization_url, token_url, and userinfo_url');
      }
      return {
        authorization_url: config.authorization_url,
        token_url: config.token_url,
        userinfo_url: config.userinfo_url,
      };
    default:
      throw new Error(`Unknown provider type: ${config.provider_type}`);
  }
}

/** Build the full authorization URL to redirect the user to the identity provider. */
export function buildAuthorizationUrl(
  config: OAuthProviderConfig,
  redirectUri: string,
  state: string,
  codeChallenge: string,
): string {
  const endpoints = getProviderEndpoints(config);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.client_id,
    redirect_uri: redirectUri,
    scope: config.scopes || 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Azure AD: prompt=select_account for a better UX
  if (config.provider_type === 'azure_ad') {
    params.set('prompt', 'select_account');
  }

  return `${endpoints.authorization_url}?${params.toString()}`;
}

/** Exchange an authorization code for tokens. */
export async function exchangeCodeForTokens(
  config: OAuthProviderConfig,
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<OAuthTokenResponse> {
  const endpoints = getProviderEndpoints(config);
  const clientSecret = decryptCredential(config.client_secret_encrypted);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.client_id,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
  });

  const response = await fetch(endpoints.token_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    console.error('OAuth token exchange failed:', response.status);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<OAuthTokenResponse>;
}

/** Extract user info from the ID token or by calling the userinfo endpoint. */
export async function getUserInfo(
  config: OAuthProviderConfig,
  tokens: OAuthTokenResponse,
): Promise<OAuthUserInfo> {
  // Try to decode the ID token first (JWT payload is the middle segment)
  if (tokens.id_token) {
    try {
      const parts = tokens.id_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString(),
        );

        // Validate essential OIDC claims
        if (payload.aud && payload.aud !== config.client_id) {
          console.error('OAuth: ID token audience mismatch');
          // Fall through to userinfo endpoint
        } else if (payload.email) {
          return {
            sub: payload.sub || payload.oid || '',
            email: payload.email || payload.preferred_username || '',
            name: payload.name,
            given_name: payload.given_name,
            family_name: payload.family_name,
            picture: payload.picture,
          };
        }
      }
    } catch {
      // Fall through to userinfo endpoint
    }
  }

  // Call the userinfo endpoint
  const endpoints = getProviderEndpoints(config);
  const response = await fetch(endpoints.userinfo_url, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Userinfo request failed: ${response.status}`);
  }

  return response.json() as Promise<OAuthUserInfo>;
}

/** Validate that the user's email matches the domain restriction (if set). */
export function validateEmailDomain(email: string, restriction: string | null): boolean {
  if (!restriction) return true;
  const emailParts = email.toLowerCase().split('@');
  if (emailParts.length !== 2) return false;
  const emailDomain = emailParts[1];
  const allowedDomains = restriction.split(',').map(d => d.trim().toLowerCase());
  return allowedDomains.includes(emailDomain);
}
