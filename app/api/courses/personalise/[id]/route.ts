import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import {
  isFeatureEnabledForTenant,
  fetchPersonalisedCourseDetail,
} from '@/lib/personalised-courses/repository';

export const GET = withTenantAuth(async ({ user, tq, tenantId, request }) => {
  if (!(await isFeatureEnabledForTenant(tq, tenantId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean).pop();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const course = await fetchPersonalisedCourseDetail(tq, id, user.id);
  if (!course) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(course);
});
