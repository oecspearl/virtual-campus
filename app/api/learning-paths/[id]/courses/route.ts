import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/learning-paths/[id]/courses
 * Get courses in a learning path
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: courses, error } = await tq
      .from('learning_path_courses')
      .select(`
        id,
        order,
        is_required,
        unlock_after_previous,
        course:courses(
          id,
          title,
          description,
          thumbnail,
          lesson_count,
          instructor:users!courses_instructor_id_fkey(id, full_name)
        )
      `)
      .eq('learning_path_id', id)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching learning path courses:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    return NextResponse.json({ courses: courses || [] });
  } catch (error) {
    console.error('Error in learning path courses GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/learning-paths/[id]/courses
 * Add a course to a learning path
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

    // Check ownership or admin status
    const { data: path } = await tq
      .from('learning_paths')
      .select('created_by')
      .eq('id', id)
      .single();

    const { data: profile } = await tq
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!path) {
      return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
    }

    if (path.created_by !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { course_id, order, is_required, unlock_after_previous } = body;

    if (!course_id) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    // Get the next order number if not provided
    let courseOrder = order;
    if (courseOrder === undefined) {
      const { data: lastCourse } = await tq
        .from('learning_path_courses')
        .select('order')
        .eq('learning_path_id', id)
        .order('order', { ascending: false })
        .limit(1)
        .single();

      courseOrder = (lastCourse?.order ?? -1) + 1;
    }

    const { data: pathCourse, error } = await tq
      .from('learning_path_courses')
      .insert({
        learning_path_id: id,
        course_id,
        order: courseOrder,
        is_required: is_required ?? true,
        unlock_after_previous: unlock_after_previous ?? true,
      })
      .select(`
        id,
        order,
        is_required,
        unlock_after_previous,
        course:courses(id, title, thumbnail)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Course already in learning path' }, { status: 409 });
      }
      console.error('Error adding course to learning path:', error);
      return NextResponse.json({ error: 'Failed to add course' }, { status: 500 });
    }

    return NextResponse.json({ course: pathCourse }, { status: 201 });
  } catch (error) {
    console.error('Error in learning path courses POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/learning-paths/[id]/courses
 * Reorder courses in a learning path
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership or admin status
    const { data: path } = await tq
      .from('learning_paths')
      .select('created_by')
      .eq('id', id)
      .single();

    const { data: profile } = await tq
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!path) {
      return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
    }

    if (path.created_by !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { courses } = body; // Array of { id, order }

    if (!Array.isArray(courses)) {
      return NextResponse.json({ error: 'courses array is required' }, { status: 400 });
    }

    // Update each course order
    const updates = courses.map((c: { id: string; order: number }) =>
      tq
        .from('learning_path_courses')
        .update({ order: c.order })
        .eq('id', c.id)
        .eq('learning_path_id', id)
    );

    await Promise.all(updates);

    // Fetch updated courses
    const { data: updatedCourses } = await tq
      .from('learning_path_courses')
      .select(`
        id,
        order,
        is_required,
        unlock_after_previous,
        course:courses(id, title, thumbnail)
      `)
      .eq('learning_path_id', id)
      .order('order', { ascending: true });

    return NextResponse.json({ courses: updatedCourses });
  } catch (error) {
    console.error('Error in learning path courses PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/learning-paths/[id]/courses
 * Remove a course from a learning path
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership or admin status
    const { data: path } = await tq
      .from('learning_paths')
      .select('created_by')
      .eq('id', id)
      .single();

    const { data: profile } = await tq
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!path) {
      return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
    }

    if (path.created_by !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await tq
      .from('learning_path_courses')
      .delete()
      .eq('learning_path_id', id)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error removing course from learning path:', error);
      return NextResponse.json({ error: 'Failed to remove course' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in learning path courses DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
