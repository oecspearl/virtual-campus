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
  // Try to decode the ID token first (JWT payload is the middle segment).
  // Prefer the ID token over the userinfo endpoint: it's signed, has more
  // claims, and Microsoft Graph's /oidc/userinfo can return a sparse
  // response depending on the app's API permissions.
  //
  // Audience mismatch is fatal: it means the IdP issued this token for a
  // different application than what we have configured. Falling through to
  // userinfo would mask the misconfiguration and silently provision users
  // with email-prefix names (Graph userinfo is sparse without extra scopes).
  if (tokens.id_token) {
    const parts = tokens.id_token.split('.');
    if (parts.length === 3) {
      let payload: Record<string, unknown> | null = null;
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      } catch {
        payload = null;
      }

      if (payload) {
        if (payload.aud && payload.aud !== config.client_id) {
          throw new Error(
            `ID token audience mismatch: expected ${config.client_id}, got ${String(payload.aud)}`,
          );
        }
        const claims = extractClaims(payload);
        if (claims.sub && claims.email) {
          return claims;
        }
      }
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

  const data = (await response.json()) as Record<string, unknown>;
  return extractClaims(data);
}

/**
 * Normalise OIDC claims into our OAuthUserInfo shape. Microsoft Entra (Azure
 * AD) work/school accounts often omit the `email` claim and put the
 * email-like identifier in `preferred_username` (the UPN) or `upn` instead;
 * accept either as the email so we don't end up provisioning users with no
 * name (the email-prefix fallback in createOAuthSession depends on email).
 */
function extractClaims(payload: Record<string, unknown>): OAuthUserInfo {
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v ? v : undefined;

  const given = str(payload.given_name);
  const family = str(payload.family_name);
  // If the IdP omits `name` but returns given_name + family_name (some
  // generic OIDC providers do), assemble a display name so we don't drop
  // the surname downstream.
  const composed = [given, family].filter(Boolean).join(' ') || undefined;

  return {
    sub: str(payload.sub) || str(payload.oid) || '',
    email:
      str(payload.email) ||
      str(payload.preferred_username) ||
      str(payload.upn) ||
      '',
    name: str(payload.name) || composed,
    given_name: given,
    family_name: family,
    picture: str(payload.picture),
  };
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
