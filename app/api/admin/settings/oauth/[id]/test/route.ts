import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';
import { getProviderEndpoints } from '@/lib/oauth/provider';
import type { OAuthProviderConfig } from '@/lib/oauth/types';

const ALLOWED_ROLES = ['admin', 'super_admin', 'tenant_admin'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ALLOWED_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: provider, error } = await tq
      .from('oauth_providers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const config = provider as OAuthProviderConfig;

    // Test connectivity by resolving endpoints and hitting the authorization URL
    try {
      const endpoints = getProviderEndpoints(config);

      // For Azure AD and Google, try to fetch the OpenID discovery document
      let discoveryUrl: string | null = null;
      if (config.provider_type === 'azure_ad') {
        const azureTenant = config.provider_tenant_id || 'common';
        discoveryUrl = `https://login.microsoftonline.com/${azureTenant}/v2.0/.well-known/openid-configuration`;
      } else if (config.provider_type === 'google') {
        discoveryUrl = 'https://accounts.google.com/.well-known/openid-configuration';
      }

      if (discoveryUrl) {
        const discoveryResponse = await fetch(discoveryUrl, { signal: AbortSignal.timeout(10000) });
        if (!discoveryResponse.ok) {
          await tq
            .from('oauth_providers')
            .update({ connection_status: 'failed' })
            .eq('id', id);

          return NextResponse.json({
            success: false,
            error: `Discovery endpoint returned ${discoveryResponse.status}`,
            endpoints,
          }, { status: 200 });
        }

        const discovery = await discoveryResponse.json();

        await tq
          .from('oauth_providers')
          .update({ connection_status: 'connected' })
          .eq('id', id);

        return NextResponse.json({
          success: true,
          message: 'Provider discovery endpoint is reachable',
          issuer: discovery.issuer,
          endpoints,
        });
      }

      // For generic OIDC, just verify the authorization URL is reachable
      const testResponse = await fetch(endpoints.authorization_url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });

      // Authorization endpoints typically return 302 or 200
      const reachable = testResponse.status < 500;

      await tq
        .from('oauth_providers')
        .update({ connection_status: reachable ? 'connected' : 'failed' })
        .eq('id', id);

      return NextResponse.json({
        success: reachable,
        message: reachable ? 'Provider endpoint is reachable' : 'Provider endpoint returned an error',
        endpoints,
      });
    } catch (fetchError: any) {
      await tq
        .from('oauth_providers')
        .update({ connection_status: 'failed' })
        .eq('id', id);

      return NextResponse.json({
        success: false,
        error: fetchError.message || 'Failed to reach provider',
      }, { status: 200 });
    }
  } catch (error) {
    console.error('OAuth provider test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
