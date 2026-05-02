import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import {
  isFeatureEnabledForTenant,
  fetchCatalogue,
} from '@/lib/personalised-courses/repository';

// Catalogue endpoint for the build screen. Same 3-way access predicate as
// the assembly endpoint — only lessons in opted-in, published courses, and
// only when the tenant has the feature enabled.

export const GET = withTenantAuth(async ({ tq, tenantId, request }) => {
  if (!(await isFeatureEnabledForTenant(tq, tenantId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const url = new URL(request.url);
  const result = await fetchCatalogue(tq, {
    search: url.searchParams.get('search') ?? undefined,
    courseId: url.searchParams.get('courseId') ?? undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    offset: url.searchParams.get('offset') ? Number(url.searchParams.get('offset')) : undefined,
  });
  return NextResponse.json(result);
});
