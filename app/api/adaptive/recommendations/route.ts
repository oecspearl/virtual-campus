import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/adaptive/recommendations
 * Get personalized learning recommendations for the current student
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    const { data: recommendations, error } = await serviceSupabase
      .from('student_adaptive_recommendations')
      .select(`
        id,
        rule_id,
        quiz_attempt_id,
        recommendation_type,
        target_id,
        status,
        created_at,
        rule:adaptive_rules(
          condition_type,
          condition_value,
          action_type
        )
      `)
      .eq('student_id', user.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recommendations:', error);
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
    }

    // Enrich recommendations with target details
    const enrichedRecommendations = await Promise.all(
      (recommendations || []).map(async (rec) => {
        let targetDetails = null;

        if (rec.recommendation_type === 'recommend_lesson' && rec.target_id) {
          const { data: lesson } = await serviceSupabase
            .from('lessons')
            .select('id, title, course_id, course:courses(title)')
            .eq('id', rec.target_id)
            .single();
          targetDetails = lesson;
        } else if (rec.recommendation_type === 'recommend_resource' && rec.target_id) {
          const { data: resource } = await serviceSupabase
            .from('lecturer_resources')
            .select('id, title, description, resource_type')
            .eq('id', rec.target_id)
            .single();
          targetDetails = resource;
        }

        return {
          ...rec,
          target: targetDetails,
        };
      })
    );

    return NextResponse.json({ recommendations: enrichedRecommendations });
  } catch (error) {
    console.error('Error in recommendations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/adaptive/recommendations
 * Generate recommendations based on a quiz attempt
 * This is typically called automatically after quiz submission
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { quiz_attempt_id } = body;

    if (!quiz_attempt_id) {
      return NextResponse.json({ error: 'quiz_attempt_id is required' }, { status: 400 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    // Get the quiz attempt
    const { data: attempt } = await serviceSupabase
      .from('quiz_attempts')
      .select(`
        id,
        quiz_id,
        student_id,
        score,
        time_spent,
        answers
      `)
      .eq('id', quiz_attempt_id)
      .single();

    if (!attempt) {
      return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 });
    }

    // Verify the attempt belongs to the current user
    if (attempt.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get applicable rules for this quiz
    const { data: rules } = await serviceSupabase
      .from('adaptive_rules')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)
      .order('priority', { ascending: false });

    if (!rules || rules.length === 0) {
      return NextResponse.json({ recommendations: [], message: 'No adaptive rules configured' });
    }

    // Evaluate rules and generate recommendations
    const recommendations: Array<{
      rule_id: string;
      quiz_attempt_id: string;
      recommendation_type: string;
      target_id: string | null;
      student_id: string;
      status: string;
    }> = [];

    for (const rule of rules) {
      const conditionMet = evaluateCondition(rule, attempt);

      if (conditionMet) {
        recommendations.push({
          rule_id: rule.id,
          quiz_attempt_id: attempt.id,
          recommendation_type: rule.action_type,
          target_id: rule.action_target,
          student_id: user.id,
          status: 'pending',
        });
      }
    }

    // Insert recommendations
    if (recommendations.length > 0) {
      const { data: insertedRecs, error } = await serviceSupabase
        .from('student_adaptive_recommendations')
        .insert(recommendations)
        .select();

      if (error) {
        console.error('Error inserting recommendations:', error);
        return NextResponse.json({ error: 'Failed to create recommendations' }, { status: 500 });
      }

      return NextResponse.json({
        recommendations: insertedRecs,
        message: `Generated ${insertedRecs?.length || 0} recommendations`
      });
    }

    return NextResponse.json({ recommendations: [], message: 'No recommendations generated' });
  } catch (error) {
    console.error('Error in recommendations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/adaptive/recommendations
 * Update recommendation status (mark as viewed, completed, dismissed)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recommendation_id, status } = body;

    if (!recommendation_id || !status) {
      return NextResponse.json({
        error: 'recommendation_id and status are required'
      }, { status: 400 });
    }

    const validStatuses = ['pending', 'viewed', 'completed', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    // Verify ownership and update
    const { data: recommendation, error } = await serviceSupabase
      .from('student_adaptive_recommendations')
      .update({ status })
      .eq('id', recommendation_id)
      .eq('student_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recommendation:', error);
      return NextResponse.json({ error: 'Failed to update recommendation' }, { status: 500 });
    }

    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error('Error in recommendations PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface AdaptiveRule {
  condition_type: string;
  condition_value: {
    threshold?: number;
    topics?: string[];
    max_time?: number;
  };
}

interface QuizAttempt {
  score: number;
  time_spent?: number;
  answers?: Array<{
    topic?: string;
    is_correct?: boolean;
  }>;
}

function evaluateCondition(rule: AdaptiveRule, attempt: QuizAttempt): boolean {
  const { condition_type, condition_value } = rule;
  const threshold = condition_value?.threshold || 70;

  switch (condition_type) {
    case 'score_below':
      return attempt.score < threshold;

    case 'score_above':
      return attempt.score >= threshold;

    case 'topic_weak': {
      // Check if student performed poorly on specific topics
      const weakTopics = condition_value?.topics || [];
      if (!attempt.answers || weakTopics.length === 0) return false;

      const topicScores: Record<string, { correct: number; total: number }> = {};

      attempt.answers.forEach((answer) => {
        const topic = answer.topic || 'general';
        if (!topicScores[topic]) {
          topicScores[topic] = { correct: 0, total: 0 };
        }
        topicScores[topic].total++;
        if (answer.is_correct) {
          topicScores[topic].correct++;
        }
      });

      // Check if any specified topic has score below threshold
      return weakTopics.some(topic => {
        const score = topicScores[topic];
        if (!score || score.total === 0) return false;
        return (score.correct / score.total) * 100 < threshold;
      });
    }

    case 'time_exceeded': {
      const maxTime = condition_value?.max_time || 3600; // Default 1 hour in seconds
      return (attempt.time_spent || 0) > maxTime;
    }

    default:
      return false;
  }
}
