import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * POST /api/student/todos/sync
 * Sync todos from course assignments and quizzes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get user's enrolled courses
    const { data: enrollments } = await tq
      .from('enrollments')
      .select('course_id')
      .eq('student_id', user.id)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({
        synced: 0,
        message: 'No enrolled courses found'
      });
    }

    const courseIds = enrollments.map(e => e.course_id);
    let synced = 0;

    // Sync assignments with due dates
    const { data: assignments } = await tq
      .from('assignments')
      .select('id, title, due_date, course_id')
      .in('course_id', courseIds)
      .not('due_date', 'is', null)
      .gte('due_date', new Date().toISOString());

    for (const assignment of assignments || []) {
      // Check if todo already exists for this assignment
      const { data: existing } = await tq
        .from('student_todos')
        .select('id')
        .eq('student_id', user.id)
        .eq('source_type', 'assignment')
        .eq('source_id', assignment.id)
        .single();

      if (!existing) {
        await tq
          .from('student_todos')
          .insert({
            student_id: user.id,
            title: `Complete: ${assignment.title}`,
            due_date: assignment.due_date,
            priority: 'high',
            status: 'pending',
            source_type: 'assignment',
            source_id: assignment.id,
            course_id: assignment.course_id,
          });
        synced++;
      }
    }

    // Sync quizzes with due dates
    const { data: quizzes } = await tq
      .from('quizzes')
      .select('id, title, due_date, course_id')
      .in('course_id', courseIds)
      .not('due_date', 'is', null)
      .gte('due_date', new Date().toISOString());

    for (const quiz of quizzes || []) {
      // Check if user hasn't already completed this quiz
      const { data: attempt } = await tq
        .from('quiz_attempts')
        .select('id')
        .eq('quiz_id', quiz.id)
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .single();

      if (attempt) continue; // Skip if already completed

      // Check if todo already exists for this quiz
      const { data: existing } = await tq
        .from('student_todos')
        .select('id')
        .eq('student_id', user.id)
        .eq('source_type', 'quiz')
        .eq('source_id', quiz.id)
        .single();

      if (!existing) {
        await tq
          .from('student_todos')
          .insert({
            student_id: user.id,
            title: `Take Quiz: ${quiz.title}`,
            due_date: quiz.due_date,
            priority: 'high',
            status: 'pending',
            source_type: 'quiz',
            source_id: quiz.id,
            course_id: quiz.course_id,
          });
        synced++;
      }
    }

    return NextResponse.json({
      synced,
      message: synced > 0
        ? `Synced ${synced} task${synced !== 1 ? 's' : ''} from your courses`
        : 'No new tasks to sync'
    });
  } catch (error) {
    console.error('Error in todos sync POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
