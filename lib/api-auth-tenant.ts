import { NextRequest } from 'next/server';
import { authenticateUser } from './api-auth';
import { getTenantIdFromRequest } from './tenant-query';
import { createServiceSupabaseClient } from './supabase-server';

interface TenantAuthResult {
  success: boolean;
  user?: any;
  userProfile?: any;
  tenantId?: string;
  tenantRole?: string;
  error?: string;
  status?: number;
}

/**
 * Authenticates the user AND verifies their membership in the current tenant.
 * Returns the user's tenant-specific role from tenant_memberships.
 *
 * Usage:
 *   const authResult = await authenticateUserWithTenant(request);
 *   if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
 *   const { user, userProfile, tenantId, tenantRole } = authResult;
 */
export async function authenticateUserWithTenant(
  request: NextRequest
): Promise<TenantAuthResult> {
  // 1. Standard authentication
  const authResult = await authenticateUser(request);
  if (!authResult.success) {
    return authResult;
  }

  // 2. Get tenant from headers
  let tenantId: string;
  try {
    tenantId = getTenantIdFromRequest(request);
  } catch {
    return {
      success: false,
      error: 'Tenant context not available',
      status: 400,
    };
  }

  // 3. Check tenant status (suspended tenants block API access)
  const serviceSupabase = createServiceSupabaseClient();
  const { data: tenant } = await serviceSupabase
    .from('tenants')
    .select('status')
    .eq('id', tenantId)
    .single();

  if (tenant?.status === 'suspended') {
    // Super admins can still access suspended tenants for management
    if (authResult.userProfile.role !== 'super_admin') {
      return {
        success: false,
        error: 'This institution is currently suspended. Please contact your administrator.',
        status: 403,
      };
    }
  }

  // 4. Look up user's role in this tenant
  const { data: membership } = await serviceSupabase
    .from('tenant_memberships')
    .select('role')
    .eq('user_id', authResult.user.id)
    .eq('tenant_id', tenantId)
    .single();

  if (!membership) {
    // User is not a member of this tenant
    return {
      success: false,
      error: 'You do not have access to this institution',
      status: 403,
    };
  }

  return {
    ...authResult,
    tenantId,
    tenantRole: membership.role,
  };
}
