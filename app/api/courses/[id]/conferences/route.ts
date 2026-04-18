import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { id: courseId } = await params;

    // Guard against invalid/missing course IDs (e.g. callers passing "undefined")
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!courseId || !UUID_RE.test(courseId)) {
      return NextResponse.json({ conferences: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Read-only access: allow all authenticated users to view conferences for the course

    // Get conferences for this course
    let query = tq
      .from('video_conferences')
      .select(`
        *,
        instructor:users!video_conferences_instructor_id_fkey(
          id,
          email
        ),
        course:courses!video_conferences_course_id_fkey(
          id,
          title,
          description
        ),
        lesson:lessons!video_conferences_lesson_id_fkey(
          id,
          title
        )
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: conferences, error } = await query;

    if (error) {
      console.error('Error fetching course conferences:', error);
      return NextResponse.json({ error: 'Failed to fetch conferences' }, { status: 500 });
    }

    console.log('Conferences fetched:', conferences?.length || 0);
    console.log('Sample conference:', conferences?.[0]);

    return NextResponse.json({ conferences: conferences || [] });
  } catch (error) {
    console.error('Error in course conferences GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
