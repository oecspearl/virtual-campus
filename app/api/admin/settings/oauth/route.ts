import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';
import { encryptCredential } from '@/lib/sonisweb/client';

const ALLOWED_ROLES = ['admin', 'super_admin', 'tenant_admin'] as const;
const VALID_PROVIDER_TYPES = ['azure_ad', 'google', 'generic_oidc'] as const;

const PUBLIC_FIELDS = 'id, provider_type, display_name, enabled, client_id, provider_tenant_id, authorization_url, token_url, userinfo_url, scopes, auto_provision_users, default_role, email_domain_restriction, button_label, button_icon, sort_order, connection_status, last_used_at, created_at, updated_at';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('oauth_providers')
      .select(PUBLIC_FIELDS);

    if (error) {
      console.error('Error fetching OAuth providers:', error);
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('OAuth providers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      provider_type, display_name, client_id, client_secret,
      provider_tenant_id, authorization_url, token_url, userinfo_url,
      scopes, auto_provision_users, default_role, email_domain_restriction,
      button_label, button_icon, sort_order,
    } = body;

    if (!provider_type || !display_name || !client_id || !client_secret) {
      return NextResponse.json(
        { error: 'Missing required fields: provider_type, display_name, client_id, client_secret' },
        { status: 400 },
      );
    }

    if (!VALID_PROVIDER_TYPES.includes(provider_type)) {
      return NextResponse.json(
        { error: `Invalid provider_type. Must be one of: ${VALID_PROVIDER_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (provider_type === 'generic_oidc' && (!authorization_url || !token_url || !userinfo_url)) {
      return NextResponse.json(
        { error: 'Generic OIDC providers require authorization_url, token_url, and userinfo_url' },
        { status: 400 },
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check for duplicate provider_type within tenant
    const { data: existing } = await tq
      .from('oauth_providers')
      .select('id')
      .eq('provider_type', provider_type)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `An ${provider_type} provider is already configured for this tenant` },
        { status: 409 },
      );
    }

    const encryptedSecret = encryptCredential(client_secret);

    const { data: provider, error: insertError } = await tq
      .from('oauth_providers')
      .insert({
        provider_type,
        display_name,
        client_id,
        client_secret_encrypted: encryptedSecret,
        provider_tenant_id: provider_tenant_id || null,
        authorization_url: authorization_url || null,
        token_url: token_url || null,
        userinfo_url: userinfo_url || null,
        scopes: scopes || 'openid email profile',
        auto_provision_users: auto_provision_users ?? true,
        default_role: default_role || 'student',
        email_domain_restriction: email_domain_restriction || null,
        button_label: button_label || null,
        button_icon: button_icon || null,
        sort_order: sort_order ?? 0,
        created_by: authResult.userProfile.id,
        enabled: false,
      })
      .select(PUBLIC_FIELDS)
      .single();

    if (insertError || !provider) {
      console.error('Error creating OAuth provider:', insertError);
      return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
    }

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error('OAuth providers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
