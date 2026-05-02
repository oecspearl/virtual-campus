import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { isFeatureEnabledForTenant } from '@/lib/personalised-courses/repository';

// Tiny status endpoint the navbar polls once on mount to decide whether to
// surface the "Personalised Paths" link. Returns the gating bit only — no
// user data, no draft/active counts, nothing that would let a probe infer
// anything about the tenant beyond the binary flag.

export const GET = withTenantAuth(async ({ tq, tenantId }) => {
  const enabled = await isFeatureEnabledForTenant(tq, tenantId);
  return NextResponse.json({ enabled });
});
