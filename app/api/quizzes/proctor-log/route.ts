import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ViolationType } from '@/types/proctor';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { createLogger } from '@/lib/logger';

interface ProctorLogRequest {
  quiz_id: string;
  quiz_attempt_id: string;
  violation_type: ViolationType;
  violation_count: number;
  auto_submitted: boolean;
  violation_details: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const log = createLogger('api/quizzes/proctor-log', request);
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ProctorLogRequest = await request.json();

    const {
      quiz_id,
      quiz_attempt_id,
      violation_type,
      violation_count,
      auto_submitted,
      violation_details,
    } = body;

    // Validate required fields
    if (!quiz_id || !quiz_attempt_id || !violation_type) {
      return NextResponse.json(
        { error: 'Missing required fields: quiz_id, quiz_attempt_id, violation_type' },
        { status: 400 }
      );
    }

    // Validate violation type
    const validTypes: ViolationType[] = [
      'tab_switch',
      'window_blur',
      'fullscreen_exit',
      'right_click',
      'keyboard_shortcut',
      'copy_attempt',
      'paste_attempt',
    ];

    if (!validTypes.includes(violation_type)) {
      return NextResponse.json(
        { error: `Invalid violation_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify the quiz attempt belongs to this user
    const { data: attempt, error: attemptError } = await tq
      .from('quiz_attempts')
      .select('id, student_id, quiz_id')
      .eq('id', quiz_attempt_id)
      .single();

    if (attemptError || !attempt) {
      log.warn('Quiz attempt not found', { quizAttemptId: quiz_attempt_id });
      return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 });
    }

    if (attempt.student_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Insert proctor log
    const { data: logRow, error: insertError } = await tq
      .from('quiz_proctor_logs')
      .insert({
        quiz_attempt_id,
        student_id: user.id,
        quiz_id,
        violation_type,
        violation_count,
        auto_submitted,
        violation_details,
      })
      .select()
      .single();

    if (insertError) {
      log.error('Failed to insert proctor log', { quizAttemptId: quiz_attempt_id, violationType: violation_type }, insertError);
      return NextResponse.json(
        { error: 'Failed to log violation' },
        { status: 500 }
      );
    }

    log.info('Proctor violation logged', { violationType: violation_type, quizAttemptId: quiz_attempt_id, violationCount: violation_count });

    return NextResponse.json({
      success: true,
      log_id: logRow.id,
      violation_count,
      auto_submitted,
    });
  } catch (error) {
    log.error('POST handler crashed', undefined, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for instructors to view proctor logs for an attempt
export async function GET(request: NextRequest) {
  const log = createLogger('api/quizzes/proctor-log', request);
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attempt_id');
    const quizId = searchParams.get('quiz_id');
    const studentId = searchParams.get('student_id');

    // Build query
    let query = tq
      .from('quiz_proctor_logs')
      .select('*')
      .order('created_at', { ascending: true });

    if (attemptId) {
      query = query.eq('quiz_attempt_id', attemptId);
    }
    if (quizId) {
      query = query.eq('quiz_id', quizId);
    }
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data: logs, error } = await query;

    if (error) {
      log.error('Failed to fetch proctor logs', undefined, error);
      return NextResponse.json({ error: 'Failed to fetch proctor logs' }, { status: 500 });
    }

    return NextResponse.json({ logs });
  } catch (error) {
    log.error('GET handler crashed', undefined, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
