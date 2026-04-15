export type OAuthProviderType = 'azure_ad' | 'google' | 'generic_oidc';

export interface OAuthProviderConfig {
  id: string;
  tenant_id: string;
  provider_type: OAuthProviderType;
  display_name: string;
  enabled: boolean;
  client_id: string;
  client_secret_encrypted: string;
  provider_tenant_id: string | null;
  authorization_url: string | null;
  token_url: string | null;
  userinfo_url: string | null;
  scopes: string;
  auto_provision_users: boolean;
  default_role: string;
  email_domain_restriction: string | null;
  button_label: string | null;
  button_icon: string | null;
  sort_order: number;
  last_used_at: string | null;
  connection_status: 'pending' | 'connected' | 'failed' | 'disabled';
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Public-safe provider info returned to the login page (no secrets). */
export interface OAuthProviderPublic {
  provider_type: OAuthProviderType;
  display_name: string;
  button_label: string | null;
  button_icon: string | null;
}

export interface OAuthTokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

export interface OAuthUserInfo {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface OAuthEndpoints {
  authorization_url: string;
  token_url: string;
  userinfo_url: string;
  jwks_url?: string;
}

export interface OAuthState {
  tenant_id: string;
  nonce: string;
  provider_type: OAuthProviderType;
  timestamp: number;
}
