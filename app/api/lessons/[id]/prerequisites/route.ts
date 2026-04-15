import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lessons/[id]/prerequisites
 * Get prerequisite information for a lesson
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: lesson, error } = await tq.from('lessons')
      .select(`
        id,
        title,
        prerequisite_lesson_id,
        prerequisite_type,
        prerequisite_min_score,
        prerequisite:lessons!lessons_prerequisite_lesson_id_fkey(
          id,
          title,
          course_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }
      console.error('Error fetching lesson prerequisites:', error);
      return NextResponse.json({ error: 'Failed to fetch prerequisites' }, { status: 500 });
    }

    const prereq = Array.isArray(lesson.prerequisite) ? lesson.prerequisite[0] : lesson.prerequisite;
    return NextResponse.json({
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      prerequisite: prereq ? {
        lesson_id: prereq.id,
        lesson_title: prereq.title,
        course_id: prereq.course_id,
        type: lesson.prerequisite_type,
        min_score: lesson.prerequisite_min_score,
      } : null,
    });
  } catch (error) {
    console.error('Error in lesson prerequisites GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/lessons/[id]/prerequisites
 * Set prerequisite for a lesson
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    // Get lesson and check ownership
    const { data: lesson } = await tq.from('lessons')
      .select('id, course_id, course:courses(instructor_id)')
      .eq('id', id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if user is instructor or admin
    const { data: profile } = await tq.from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const courseRaw = lesson.course;
    const course = (Array.isArray(courseRaw) ? courseRaw[0] : courseRaw) as unknown as { instructor_id: string } | null;
    if (course?.instructor_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { prerequisite_lesson_id, prerequisite_type, prerequisite_min_score } = body;

    // Validate prerequisite_type
    const validTypes = ['completion', 'quiz_pass', 'assignment_pass'];
    if (prerequisite_type && !validTypes.includes(prerequisite_type)) {
      return NextResponse.json({
        error: 'Invalid prerequisite_type. Must be: completion, quiz_pass, or assignment_pass'
      }, { status: 400 });
    }

    // Check for circular dependency
    if (prerequisite_lesson_id) {
      let currentPrereq = prerequisite_lesson_id;
      const visited = new Set([id]);

      while (currentPrereq) {
        if (visited.has(currentPrereq)) {
          return NextResponse.json({
            error: 'Circular prerequisite dependency detected'
          }, { status: 400 });
        }
        visited.add(currentPrereq);

        const { data: prereqLesson } = await tq.from('lessons')
          .select('prerequisite_lesson_id')
          .eq('id', currentPrereq)
          .single();

        currentPrereq = prereqLesson?.prerequisite_lesson_id;
      }
    }

    // Update lesson prerequisites
    const { data: updatedLesson, error } = await tq.from('lessons')
      .update({
        prerequisite_lesson_id: prerequisite_lesson_id || null,
        prerequisite_type: prerequisite_lesson_id ? (prerequisite_type || 'completion') : null,
        prerequisite_min_score: prerequisite_lesson_id ? (prerequisite_min_score || null) : null,
      })
      .eq('id', id)
      .select(`
        id,
        title,
        prerequisite_lesson_id,
        prerequisite_type,
        prerequisite_min_score,
        prerequisite:lessons!lessons_prerequisite_lesson_id_fkey(id, title)
      `)
      .single();

    if (error) {
      console.error('Error updating lesson prerequisites:', error);
      return NextResponse.json({ error: 'Failed to update prerequisites' }, { status: 500 });
    }

    const updatedPrereq = Array.isArray(updatedLesson.prerequisite) ? updatedLesson.prerequisite[0] : updatedLesson.prerequisite;
    return NextResponse.json({
      lesson_id: updatedLesson.id,
      lesson_title: updatedLesson.title,
      prerequisite: updatedPrereq ? {
        lesson_id: updatedPrereq.id,
        lesson_title: updatedPrereq.title,
        type: updatedLesson.prerequisite_type,
        min_score: updatedLesson.prerequisite_min_score,
      } : null,
    });
  } catch (error) {
    console.error('Error in lesson prerequisites PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/lessons/[id]/prerequisites
 * Remove prerequisite from a lesson
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    // Get lesson and check ownership
    const { data: lesson } = await tq.from('lessons')
      .select('id, course_id, course:courses(instructor_id)')
      .eq('id', id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if user is instructor or admin
    const { data: profile } = await tq.from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const courseRawDel = lesson.course;
    const course = (Array.isArray(courseRawDel) ? courseRawDel[0] : courseRawDel) as unknown as { instructor_id: string } | null;
    if (course?.instructor_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Remove prerequisites
    const { error } = await tq.from('lessons')
      .update({
        prerequisite_lesson_id: null,
        prerequisite_type: null,
        prerequisite_min_score: null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error removing lesson prerequisites:', error);
      return NextResponse.json({ error: 'Failed to remove prerequisites' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in lesson prerequisites DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
