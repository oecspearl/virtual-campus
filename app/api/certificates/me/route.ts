import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database-helpers';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/certificates/me
 * Get current user's certificates
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

  } catch (error: any) {
    console.error('Get my certificates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

