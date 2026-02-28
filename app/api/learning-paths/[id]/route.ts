import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/learning-paths/[id]
 * Get a single learning path with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeProgress = searchParams.get('include_progress') === 'true';

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: path, error } = await tq
      .from('learning_paths')
      .select(`
        *,
        creator:users!learning_paths_created_by_fkey(id, full_name, avatar_url),
        courses:learning_path_courses(
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
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
      }
      console.error('Error fetching learning path:', error);
      return NextResponse.json({ error: 'Failed to fetch learning path' }, { status: 500 });
    }

    // Sort courses by order
    if (path.courses) {
      path.courses.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
    }

    // Include enrollment and progress if requested and user is logged in
    if (includeProgress && user) {
      const { data: enrollment } = await tq
        .from('learning_path_enrollments')
        .select('*')
        .eq('learning_path_id', id)
        .eq('student_id', user.id)
        .single();

      if (enrollment) {
        // Get detailed progress
        const { data: progress } = await tq.raw
          .rpc('calculate_learning_path_progress', {
            p_learning_path_id: id,
            p_student_id: user.id
          });

        // Get course completion status for each course
        const courseIds = path.courses?.map((c: { course: { id: string } }) => c.course.id) || [];

        const { data: enrolledCourses } = await tq
          .from('enrollments')
          .select('course_id, progress, completed_at')
          .eq('student_id', user.id)
          .in('course_id', courseIds);

        const courseProgressMap = new Map<string, { course_id: string; progress: number; completed_at: string | null }>(
          enrolledCourses?.map((e: any) => [e.course_id, e]) || []
        );

        // Add progress to each course
        const coursesWithProgress = path.courses?.map((c: { course: { id: string }; order: number; unlock_after_previous: boolean }) => {
          const courseProgress = courseProgressMap.get(c.course.id);

          // Determine if course is unlocked
          let isUnlocked = true;
          if (c.order > 0 && c.unlock_after_previous) {
            const prevCourse = path.courses?.find((pc: { order: number }) => pc.order === c.order - 1);
            if (prevCourse) {
              const prevProgress = courseProgressMap.get(prevCourse.course.id);
              isUnlocked = prevProgress?.completed_at != null;
            }
          }

          return {
            ...c,
            progress: courseProgress || null,
            is_unlocked: isUnlocked
          };
        });

        return NextResponse.json({
          path: {
            ...path,
            courses: coursesWithProgress,
            enrollment: {
              ...enrollment,
              progress: progress || { total_courses: 0, completed_courses: 0, percentage: 0 }
            }
          }
        });
      }

      return NextResponse.json({ path: { ...path, enrollment: null } });
    }

    return NextResponse.json({ path });
  } catch (error) {
    console.error('Error in learning path GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/learning-paths/[id]
 * Update a learning path
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
    const { title, description, thumbnail, difficulty, estimated_duration, published } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration;
    if (published !== undefined) updateData.published = published;

    const { data: updatedPath, error } = await tq
      .from('learning_paths')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating learning path:', error);
      return NextResponse.json({ error: 'Failed to update learning path' }, { status: 500 });
    }

    return NextResponse.json({ path: updatedPath });
  } catch (error) {
    console.error('Error in learning path PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/learning-paths/[id]
 * Delete a learning path
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

    // Delete the learning path (cascades to courses and enrollments)
    const { error } = await tq
      .from('learning_paths')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting learning path:', error);
      return NextResponse.json({ error: 'Failed to delete learning path' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in learning path DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
