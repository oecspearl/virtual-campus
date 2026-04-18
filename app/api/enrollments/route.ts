import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { listStudentEnrollments, listAllEnrollments } from '@/lib/services/enrollment-service';

export const GET = withTenantAuth(async ({ user, tq, request }) => {
  const { searchParams } = new URL(request.url);
  const me = searchParams.get('me');

  try {
    if (me === '1') {
      const result = await listStudentEnrollments(tq, user.id);
      return NextResponse.json(result);
    }

    const result = await listAllEnrollments(tq);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch enrollments' }, { status: 500 });
  }
});
