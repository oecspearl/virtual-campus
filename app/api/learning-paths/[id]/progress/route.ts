import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/learning-paths/[id]/progress
 * Get detailed progress for a learning path
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if enrolled
    const { data: enrollment } = await tq
      .from('learning_path_enrollments')
      .select('*')
      .eq('learning_path_id', id)
      .eq('student_id', user.id)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this learning path' }, { status: 404 });
    }

    // Get learning path with courses
    const { data: path } = await tq
      .from('learning_paths')
      .select(`
        id,
        title,
        courses:learning_path_courses(
          id,
          order,
          is_required,
          unlock_after_previous,
          course_id,
          course:courses(id, title, lesson_count)
        )
      `)
      .eq('id', id)
      .single();

    if (!path) {
      return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
    }

    // Get course progress for all courses in the path
    const courseIds = path.courses?.map((c: { course_id: string }) => c.course_id) || [];

    const { data: courseEnrollments } = await tq
      .from('enrollments')
      .select('course_id, progress, completed_at, enrolled_at')
      .eq('student_id', user.id)
      .in('course_id', courseIds);

    const courseProgressMap = new Map(
      courseEnrollments?.map(e => [e.course_id, e]) || []
    );

    // Sort courses by order
    const sortedCourses = (path.courses || []).sort(
      (a: { order: number }, b: { order: number }) => a.order - b.order
    );

    // Build detailed progress for each course
    let completedCourses = 0;
    let totalRequiredCourses = 0;
    let allPreviousCompleted = true;

    const coursesWithProgress = sortedCourses.map((pathCourse: {
      id: string;
      order: number;
      is_required: boolean;
      unlock_after_previous: boolean;
      course_id: string;
      course: any;
    }) => {
      const progress = courseProgressMap.get(pathCourse.course_id);
      const isCompleted = progress?.completed_at != null;

      if (pathCourse.is_required) {
        totalRequiredCourses++;
        if (isCompleted) completedCourses++;
      }

      // Determine unlock status
      const isUnlocked = !pathCourse.unlock_after_previous || allPreviousCompleted;

      // Update for next iteration
      if (pathCourse.unlock_after_previous && !isCompleted) {
        allPreviousCompleted = false;
      }

      return {
        id: pathCourse.id,
        order: pathCourse.order,
        is_required: pathCourse.is_required,
        unlock_after_previous: pathCourse.unlock_after_previous,
        course: pathCourse.course,
        enrollment: progress ? {
          enrolled_at: progress.enrolled_at,
          progress: progress.progress,
          completed_at: progress.completed_at,
          is_completed: isCompleted,
        } : null,
        is_unlocked: isUnlocked,
      };
    });

    // Calculate overall progress
    const overallPercentage = totalRequiredCourses > 0
      ? Math.round((completedCourses / totalRequiredCourses) * 100)
      : 0;

    const isPathCompleted = totalRequiredCourses > 0 && completedCourses === totalRequiredCourses;

    // Update enrollment completion status if needed
    if (isPathCompleted && !enrollment.completed_at) {
      await tq
        .from('learning_path_enrollments')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', enrollment.id);
    }

    return NextResponse.json({
      progress: {
        enrollment: {
          enrolled_at: enrollment.enrolled_at,
          completed_at: enrollment.completed_at,
          status: enrollment.status,
        },
        overall: {
          total_courses: path.courses?.length || 0,
          required_courses: totalRequiredCourses,
          completed_courses: completedCourses,
          percentage: overallPercentage,
          is_completed: isPathCompleted,
        },
        courses: coursesWithProgress,
      },
    });
  } catch (error) {
    console.error('Error in learning path progress GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
