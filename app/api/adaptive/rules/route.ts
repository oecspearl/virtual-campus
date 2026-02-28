import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/adaptive/rules
 * Get adaptive learning rules
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quiz_id');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    let query = serviceSupabase
      .from('adaptive_rules')
      .select(`
        id,
        quiz_id,
        condition_type,
        condition_value,
        action_type,
        action_target,
        priority,
        created_at,
        quiz:quizzes(id, title, lesson_id)
      `)
      .order('priority', { ascending: false });

    if (quizId) {
      query = query.eq('quiz_id', quizId);
    }

    const { data: rules, error } = await query;

    if (error) {
      console.error('Error fetching adaptive rules:', error);
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    console.error('Error in adaptive rules GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/adaptive/rules
 * Create an adaptive learning rule
 *
 * Rule types:
 * - condition_type: 'score_below', 'score_above', 'topic_weak', 'time_exceeded'
 * - action_type: 'recommend_lesson', 'recommend_resource', 'recommend_review', 'send_notification'
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    // Check if user is admin or instructor
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'instructor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { quiz_id, condition_type, condition_value, action_type, action_target, priority } = body;

    // Validate required fields
    if (!quiz_id || !condition_type || !action_type) {
      return NextResponse.json({
        error: 'quiz_id, condition_type, and action_type are required'
      }, { status: 400 });
    }

    // Validate condition_type
    const validConditionTypes = ['score_below', 'score_above', 'topic_weak', 'time_exceeded'];
    if (!validConditionTypes.includes(condition_type)) {
      return NextResponse.json({
        error: `Invalid condition_type. Must be one of: ${validConditionTypes.join(', ')}`
      }, { status: 400 });
    }

    // Validate action_type
    const validActionTypes = ['recommend_lesson', 'recommend_resource', 'recommend_review', 'send_notification'];
    if (!validActionTypes.includes(action_type)) {
      return NextResponse.json({
        error: `Invalid action_type. Must be one of: ${validActionTypes.join(', ')}`
      }, { status: 400 });
    }

    // Verify quiz exists
    const { data: quiz } = await serviceSupabase
      .from('quizzes')
      .select('id')
      .eq('id', quiz_id)
      .single();

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const { data: rule, error } = await serviceSupabase
      .from('adaptive_rules')
      .insert({
        quiz_id,
        condition_type,
        condition_value: condition_value || {},
        action_type,
        action_target: action_target || null,
        priority: priority || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating adaptive rule:', error);
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Error in adaptive rules POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/adaptive/rules
 * Delete an adaptive learning rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    // Check if user is admin or instructor
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'instructor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await serviceSupabase
      .from('adaptive_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      console.error('Error deleting adaptive rule:', error);
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in adaptive rules DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
