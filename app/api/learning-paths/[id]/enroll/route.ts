import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/learning-paths/[id]/enroll
 * Enroll in a learning path
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if learning path exists and is published
    const { data: path } = await tq
      .from('learning_paths')
      .select('id, title, published')
      .eq('id', id)
      .single();

    if (!path) {
      return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
    }

    if (!path.published) {
      return NextResponse.json({ error: 'Learning path is not available for enrollment' }, { status: 403 });
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await tq
      .from('learning_path_enrollments')
      .select('id')
      .eq('learning_path_id', id)
      .eq('student_id', user.id)
      .single();

    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled in this learning path' }, { status: 409 });
    }

    // Create enrollment
    const { data: enrollment, error } = await tq
      .from('learning_path_enrollments')
      .insert({
        learning_path_id: id,
        student_id: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error enrolling in learning path:', error);
      return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
    }

    // Auto-enroll in the first course if it exists
    const { data: firstCourse } = await tq
      .from('learning_path_courses')
      .select('course_id')
      .eq('learning_path_id', id)
      .order('order', { ascending: true })
      .limit(1)
      .single();

    if (firstCourse) {
      // Check if not already enrolled in the course
      const { data: existingCourseEnrollment } = await tq
        .from('enrollments')
        .select('id')
        .eq('course_id', firstCourse.course_id)
        .eq('student_id', user.id)
        .single();

      if (!existingCourseEnrollment) {
        await tq
          .from('enrollments')
          .insert({
            course_id: firstCourse.course_id,
            student_id: user.id,
          });
      }
    }

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error('Error in learning path enroll POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/learning-paths/[id]/enroll
 * Unenroll from a learning path
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from('learning_path_enrollments')
      .delete()
      .eq('learning_path_id', id)
      .eq('student_id', user.id);

    if (error) {
      console.error('Error unenrolling from learning path:', error);
      return NextResponse.json({ error: 'Failed to unenroll' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in learning path enroll DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
