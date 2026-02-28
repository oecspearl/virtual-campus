import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/analytics/course-stats
 * Get comprehensive course statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'student';

    // Only instructors and admins can view course stats
    if (!hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    // Get course data
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id, progress_percentage, status')
      .eq('course_id', courseId);

    const totalStudents = enrollments?.length || 0;
    const activeStudents = enrollments?.filter(e => e.status === 'active').length || 0;
    const averageProgress = enrollments && enrollments.length > 0
      ? enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollments.length
      : 0;

    // Get assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, points, due_date')
      .eq('course_id', courseId);

    const totalAssignments = assignments?.length || 0;

    // Get assignment submissions
    const assignmentIds = assignments?.map(a => a.id) || [];
    const { data: submissions } = assignmentIds.length > 0
      ? await supabase
          .from('assignment_submissions')
          .select('assignment_id, grade, status, late')
          .in('assignment_id', assignmentIds)
      : { data: null };

    const totalSubmissions = submissions?.length || 0;
    const gradedSubmissions = submissions?.filter(s => s.status === 'graded').length || 0;
    const lateSubmissions = submissions?.filter(s => s.late === true).length || 0;

    // Get quizzes
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId);

    const totalQuizzes = quizzes?.length || 0;

    // Get quiz attempts
    const quizIds = quizzes?.map(q => q.id) || [];
    const { data: quizAttempts } = quizIds.length > 0
      ? await supabase
          .from('quiz_attempts')
          .select('percentage, status')
          .in('quiz_id', quizIds)
      : { data: null };

    const totalQuizAttempts = quizAttempts?.length || 0;
    const averageQuizScore = quizAttempts && quizAttempts.length > 0
      ? quizAttempts
          .filter(q => q.percentage)
          .reduce((sum, q) => sum + (q.percentage || 0), 0) / quizAttempts.filter(q => q.percentage).length
      : 0;

    // Get lesson progress
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('status, student_id')
      .eq('course_id', courseId);

    const completedLessons = lessonProgress?.filter(p => p.status === 'completed').length || 0;
    const totalLessonProgress = lessonProgress?.length || 0;

    // Get at-risk students
    const { data: riskScores } = await supabase
      .from('student_risk_scores')
      .select('risk_level')
      .eq('course_id', courseId)
      .in('risk_level', ['medium', 'high', 'critical']);

    const atRiskCount = riskScores?.length || 0;

    return NextResponse.json({
      data: {
        course: {
          id: course.id,
          title: course.title,
        },
        students: {
          total: totalStudents,
          active: activeStudents,
          average_progress: Math.round(averageProgress * 100) / 100,
          at_risk: atRiskCount,
        },
        assignments: {
          total: totalAssignments,
          submissions: totalSubmissions,
          graded: gradedSubmissions,
          late: lateSubmissions,
          completion_rate: totalAssignments > 0
            ? Math.round((totalSubmissions / (totalAssignments * totalStudents)) * 10000) / 100
            : 0,
        },
        quizzes: {
          total: totalQuizzes,
          attempts: totalQuizAttempts,
          average_score: Math.round(averageQuizScore * 100) / 100,
        },
        lessons: {
          completed: completedLessons,
          total_progress_records: totalLessonProgress,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in course-stats API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


