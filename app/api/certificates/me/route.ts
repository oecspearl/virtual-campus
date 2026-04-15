import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { withTenantAuth } from '@/lib/with-tenant-auth';

/**
 * GET /api/certificates/me
 * Get current user's certificates
 */
export const GET = withTenantAuth(async ({ user }) => {
  const serviceSupabase = createServiceSupabaseClient();

  const { data: certificates, error } = await serviceSupabase
    .from('certificates')
    .select(`
      *,
      course:courses!certificates_course_id_fkey(id, title, description, thumbnail)
    `)
    .eq('student_id', user.id)
    .order('issued_at', { ascending: false });

  if (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }

  return NextResponse.json({ certificates: certificates || [] });
});
