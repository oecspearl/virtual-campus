import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/database-helpers";

interface LessonProgress {
  lesson_id: string;
  lesson_title: string;
  lesson_order: number;
  status: string;
  completed_at: string | null;
  content_items_completed: number;
  content_items_total: number;
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  enrolled_at: string;
  lessons_total: number;
  lessons_completed: number;
  percentage: number;
  lessons: LessonProgress[];
}

// GET: Fetch student's progress across all enrolled courses (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin', 'instructor', 'curriculum_designer'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify student exists
    const { data: student, error: studentError } = await tq
      .from('users')
      .select('id, name, email')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get student's enrollments with course info
    const { data: enrollments, error: enrollmentsError } = await tq
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        course_id,
        courses:course_id (
          id,
          title
        )
      `)
      .eq('student_id', studentId)
      .order('enrolled_at', { ascending: false });

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({
        student,
        courses: [],
        summary: {
          total_courses: 0,
          total_lessons: 0,
          completed_lessons: 0,
          overall_percentage: 0
        }
      });
    }

    // Get course IDs
    const courseIds = enrollments.map(e => e.course_id);

    // Get all lessons for these courses
    const { data: allLessons, error: lessonsError } = await tq
      .from('lessons')
      .select('id, title, order, course_id, published')
      .in('course_id', courseIds)
      .eq('published', true)
      .order('order', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
    }

    // Get student's lesson progress
    const lessonIds = allLessons?.map(l => l.id) || [];
    const { data: lessonProgressRecords } = await tq
      .from('lesson_progress')
      .select('lesson_id, status, completed_at, started_at, last_accessed_at')
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);

    // Get content item progress for all lessons
    const { data: contentProgressRecords } = await tq
      .from('content_item_progress')
      .select('lesson_id, content_index, completed')
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);

    // Group content progress by lesson
    const contentProgressByLesson: Record<string, { completed: number; total: number }> = {};
    contentProgressRecords?.forEach(cp => {
      if (!contentProgressByLesson[cp.lesson_id]) {
        contentProgressByLesson[cp.lesson_id] = { completed: 0, total: 0 };
      }
      contentProgressByLesson[cp.lesson_id].total++;
      if (cp.completed) {
        contentProgressByLesson[cp.lesson_id].completed++;
      }
    });

    // Create progress map
    const progressMap: Record<string, { status: string; completed_at: string | null }> = {};
    lessonProgressRecords?.forEach(p => {
      progressMap[p.lesson_id] = {
        status: p.status,
        completed_at: p.completed_at
      };
    });

    // Build course progress data
    const courses: CourseProgress[] = enrollments.map(enrollment => {
      const course = enrollment.courses as unknown as { id: string; title: string } | null;
      const courseLessons = allLessons?.filter(l => l.course_id === enrollment.course_id) || [];

      const lessons: LessonProgress[] = courseLessons.map(lesson => {
        const progress = progressMap[lesson.id];
        const contentProgress = contentProgressByLesson[lesson.id] || { completed: 0, total: 0 };

        return {
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          lesson_order: lesson.order,
          status: progress?.status || 'not_started',
          completed_at: progress?.completed_at || null,
          content_items_completed: contentProgress.completed,
          content_items_total: contentProgress.total
        };
      });

      const completedLessons = lessons.filter(l => l.status === 'completed').length;
      const totalLessons = lessons.length;

      return {
        course_id: enrollment.course_id,
        course_title: course?.title || 'Unknown Course',
        enrolled_at: enrollment.enrolled_at,
        lessons_total: totalLessons,
        lessons_completed: completedLessons,
        percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        lessons
      };
    });

    // Calculate summary
    const totalLessons = courses.reduce((sum, c) => sum + c.lessons_total, 0);
    const completedLessons = courses.reduce((sum, c) => sum + c.lessons_completed, 0);

    return NextResponse.json({
      student,
      courses,
      summary: {
        total_courses: courses.length,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        overall_percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Admin student progress GET error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
