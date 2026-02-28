import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';

/**
 * GET /api/certificates/[studentId]
 * Get all certificates for a student
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await params;

    // Check permissions
    const isOwnRequest = user.id === studentId;
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(user.role);
    
    if (!isOwnRequest && !isAdmin) {
      // Check if user is instructor for any of the student's courses
      const serviceSupabase = createServiceSupabaseClient();
      const { data: enrollments } = await serviceSupabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('status', 'completed');

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        const { data: instructorCheck } = await serviceSupabase
          .from('course_instructors')
          .select('id')
          .eq('instructor_id', user.id)
          .in('course_id', courseIds)
          .limit(1);

        if (!instructorCheck || instructorCheck.length === 0) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const serviceSupabase = createServiceSupabaseClient();

    const { data: certificates, error } = await serviceSupabase
      .from('certificates')
      .select(`
        *,
        course:courses!certificates_course_id_fkey(id, title, description, thumbnail)
      `)
      .eq('student_id', studentId)
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
    console.error('Get certificates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

