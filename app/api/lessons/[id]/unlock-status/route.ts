import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lessons/[id]/unlock-status
 * Check if a lesson is unlocked for the current user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: { user } } = await tq.raw.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get lesson with prerequisite info
    const { data: lesson, error } = await tq.from('lessons')
      .select(`
        id,
        title,
        course_id,
        prerequisite_lesson_id,
        prerequisite_type,
        prerequisite_min_score,
        prerequisite:lessons!lessons_prerequisite_lesson_id_fkey(
          id,
          title
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }
      console.error('Error fetching lesson:', error);
      return NextResponse.json({ error: 'Failed to fetch lesson' }, { status: 500 });
    }

    // No prerequisite = always unlocked
    if (!lesson.prerequisite_lesson_id) {
      return NextResponse.json({
        is_unlocked: true,
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        course_id: lesson.course_id,
        prerequisite: null,
      });
    }

    // Normalize prerequisite from array to single object (Supabase join type quirk)
    const prereq = Array.isArray(lesson.prerequisite) ? lesson.prerequisite[0] : lesson.prerequisite;
    const normalizedLesson: LessonData = {
      id: lesson.id,
      title: lesson.title,
      course_id: lesson.course_id,
      prerequisite_lesson_id: lesson.prerequisite_lesson_id,
      prerequisite_type: lesson.prerequisite_type,
      prerequisite_min_score: lesson.prerequisite_min_score,
      prerequisite: prereq ? { id: prereq.id, title: prereq.title } : null,
    };

    // Use the database function to check prerequisites
    const { data: isUnlocked, error: checkError } = await tq.raw
      .rpc('check_lesson_prerequisites', {
        p_lesson_id: id,
        p_student_id: user.id
      });

    if (checkError) {
      console.error('Error checking prerequisites:', checkError);
      // Fall back to manual check
      return await checkPrerequisitesManually(tq, user.id, normalizedLesson);
    }

    // Get details about prerequisite completion
    let prerequisiteDetails = null;
    if (!isUnlocked) {
      prerequisiteDetails = await getPrerequisiteDetails(
        tq,
        user.id,
        lesson.prerequisite_lesson_id,
        lesson.prerequisite_type,
        lesson.prerequisite_min_score
      );
    }

    return NextResponse.json({
      is_unlocked: isUnlocked,
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      course_id: lesson.course_id,
      prerequisite: normalizedLesson.prerequisite ? {
        lesson_id: normalizedLesson.prerequisite.id,
        lesson_title: normalizedLesson.prerequisite.title,
        course_id: lesson.course_id, // Prerequisite lessons are in the same course
        type: lesson.prerequisite_type,
        min_score: lesson.prerequisite_min_score,
        ...prerequisiteDetails,
      } : null,
    });
  } catch (error) {
    console.error('Error in lesson unlock-status GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface LessonData {
  id: string;
  title: string;
  course_id: string;
  prerequisite_lesson_id: string;
  prerequisite_type: string | null;
  prerequisite_min_score: number | null;
  prerequisite: { id: string; title: string } | null;
}

async function checkPrerequisitesManually(
  tq: ReturnType<typeof createTenantQuery>,
  userId: string,
  lesson: LessonData
) {
  const prereqType = lesson.prerequisite_type || 'completion';
  const minScore = lesson.prerequisite_min_score;

  let isUnlocked = false;
  let prerequisiteDetails = {};

  // Check lesson completion
  const { data: progress } = await tq.from('lesson_progress')
    .select('completed, completed_at')
    .eq('lesson_id', lesson.prerequisite_lesson_id)
    .eq('student_id', userId)
    .single();

  if (prereqType === 'completion') {
    isUnlocked = progress?.completed === true;
    prerequisiteDetails = {
      is_completed: progress?.completed || false,
      completed_at: progress?.completed_at,
    };
  } else if (prereqType === 'quiz_pass') {
    // Get quiz for the prerequisite lesson
    const { data: quiz } = await tq.from('quizzes')
      .select('id, passing_score')
      .eq('lesson_id', lesson.prerequisite_lesson_id)
      .single();

    if (quiz) {
      const requiredScore = minScore || quiz.passing_score || 70;
      const { data: bestAttempt } = await tq.from('quiz_attempts')
        .select('score')
        .eq('quiz_id', quiz.id)
        .eq('student_id', userId)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      isUnlocked = (bestAttempt?.score || 0) >= requiredScore;
      prerequisiteDetails = {
        quiz_id: quiz.id,
        required_score: requiredScore,
        best_score: bestAttempt?.score || 0,
        is_passed: isUnlocked,
      };
    }
  } else if (prereqType === 'assignment_pass') {
    // Get assignment for the prerequisite lesson
    const { data: assignment } = await tq.from('assignments')
      .select('id')
      .eq('lesson_id', lesson.prerequisite_lesson_id)
      .single();

    if (assignment) {
      const requiredScore = minScore || 70;
      const { data: submission } = await tq.from('submissions')
        .select('grade')
        .eq('assignment_id', assignment.id)
        .eq('student_id', userId)
        .not('grade', 'is', null)
        .order('grade', { ascending: false })
        .limit(1)
        .single();

      isUnlocked = (submission?.grade || 0) >= requiredScore;
      prerequisiteDetails = {
        assignment_id: assignment.id,
        required_score: requiredScore,
        best_grade: submission?.grade || 0,
        is_passed: isUnlocked,
      };
    }
  }

  return NextResponse.json({
    is_unlocked: isUnlocked,
    lesson_id: lesson.id,
    lesson_title: lesson.title,
    course_id: lesson.course_id,
    prerequisite: lesson.prerequisite ? {
      lesson_id: lesson.prerequisite.id,
      lesson_title: lesson.prerequisite.title,
      course_id: lesson.course_id, // Prerequisite lessons are in the same course
      type: prereqType,
      min_score: minScore,
      ...prerequisiteDetails,
    } : null,
  });
}

async function getPrerequisiteDetails(
  tq: ReturnType<typeof createTenantQuery>,
  userId: string,
  prereqLessonId: string,
  prereqType: string | null,
  minScore: number | null
) {
  const type = prereqType || 'completion';

  if (type === 'completion') {
    const { data: progress } = await tq.from('lesson_progress')
      .select('completed, completed_at')
      .eq('lesson_id', prereqLessonId)
      .eq('student_id', userId)
      .single();

    return {
      is_completed: progress?.completed || false,
      completed_at: progress?.completed_at,
    };
  }

  if (type === 'quiz_pass') {
    const { data: quiz } = await tq.from('quizzes')
      .select('id, passing_score')
      .eq('lesson_id', prereqLessonId)
      .single();

    if (quiz) {
      const requiredScore = minScore || quiz.passing_score || 70;
      const { data: bestAttempt } = await tq.from('quiz_attempts')
        .select('score')
        .eq('quiz_id', quiz.id)
        .eq('student_id', userId)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      return {
        quiz_id: quiz.id,
        required_score: requiredScore,
        best_score: bestAttempt?.score || 0,
        is_passed: (bestAttempt?.score || 0) >= requiredScore,
      };
    }
  }

  if (type === 'assignment_pass') {
    const { data: assignment } = await tq.from('assignments')
      .select('id')
      .eq('lesson_id', prereqLessonId)
      .single();

    if (assignment) {
      const requiredScore = minScore || 70;
      const { data: submission } = await tq.from('submissions')
        .select('grade')
        .eq('assignment_id', assignment.id)
        .eq('student_id', userId)
        .not('grade', 'is', null)
        .order('grade', { ascending: false })
        .limit(1)
        .single();

      return {
        assignment_id: assignment.id,
        required_score: requiredScore,
        best_grade: submission?.grade || 0,
        is_passed: (submission?.grade || 0) >= requiredScore,
      };
    }
  }

  return {};
}
