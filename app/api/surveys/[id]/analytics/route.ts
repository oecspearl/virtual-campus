import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/surveys/[id]/analytics
 * Get analytics for a survey
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check survey exists and user has permission
    const { data: survey } = await tq
      .from('surveys')
      .select(`
        id,
        title,
        survey_type,
        creator_id,
        is_anonymous,
        created_at,
        survey_questions(id, type, question_text, options, category, "order")
      `)
      .eq('id', surveyId)
      .single();

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const isCreator = userProfile.id === survey.creator_id;
    const isAdmin = ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get cached analytics
    const { data: cachedAnalytics } = await tq
      .from('survey_analytics')
      .select('*')
      .eq('survey_id', surveyId)
      .single();

    // Get responses
    const { data: responses, error: responsesError } = await tq
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('status', 'submitted');

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
    }

    const allResponses = responses || [];
    const totalResponses = allResponses.length;

    // Calculate in-progress count
    const { count: inProgressCount } = await tq
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', surveyId)
      .eq('status', 'in_progress');

    // Calculate question statistics
    const questionStats: Record<string, any> = {};
    const questions = survey.survey_questions || [];

    for (const question of questions) {
      const stats: any = {
        question_id: question.id,
        question_text: question.question_text,
        type: question.type,
        response_count: 0,
        distribution: {},
        average: null,
        nps_score: null,
        text_responses: []
      };

      // Collect all answers for this question
      const answers: any[] = [];
      for (const response of allResponses) {
        const answer = response.answers?.find((a: any) => a.question_id === question.id);
        if (answer !== undefined && answer.answer !== undefined && answer.answer !== null) {
          answers.push(answer.answer);
          stats.response_count++;
        }
      }

      // Calculate stats based on question type
      switch (question.type) {
        case 'likert_scale':
        case 'rating_scale':
        case 'slider':
          // Numeric statistics
          const numericAnswers = answers.filter(a => typeof a === 'number');
          if (numericAnswers.length > 0) {
            stats.average = numericAnswers.reduce((sum, val) => sum + val, 0) / numericAnswers.length;
            stats.min = Math.min(...numericAnswers);
            stats.max = Math.max(...numericAnswers);

            // Distribution
            for (const val of numericAnswers) {
              stats.distribution[val] = (stats.distribution[val] || 0) + 1;
            }
          }
          break;

        case 'nps':
          // NPS calculation
          const npsAnswers = answers.filter(a => typeof a === 'number');
          if (npsAnswers.length > 0) {
            const promoters = npsAnswers.filter(a => a >= 9).length;
            const detractors = npsAnswers.filter(a => a <= 6).length;
            stats.nps_score = Math.round(((promoters - detractors) / npsAnswers.length) * 100);
            stats.promoters_count = promoters;
            stats.passives_count = npsAnswers.filter(a => a === 7 || a === 8).length;
            stats.detractors_count = detractors;

            for (const val of npsAnswers) {
              stats.distribution[val] = (stats.distribution[val] || 0) + 1;
            }
          }
          break;

        case 'multiple_choice':
          // Choice distribution
          for (const val of answers) {
            if (val) {
              stats.distribution[val] = (stats.distribution[val] || 0) + 1;
            }
          }
          break;

        case 'multiple_select':
          // Multi-select distribution
          for (const val of answers) {
            if (Array.isArray(val)) {
              for (const choice of val) {
                stats.distribution[choice] = (stats.distribution[choice] || 0) + 1;
              }
            }
          }
          break;

        case 'ranking':
          // Ranking average positions
          const rankingCounts: Record<string, number[]> = {};
          for (const val of answers) {
            if (Array.isArray(val)) {
              val.forEach((item, index) => {
                if (!rankingCounts[item]) rankingCounts[item] = [];
                rankingCounts[item].push(index + 1);
              });
            }
          }
          for (const [item, positions] of Object.entries(rankingCounts)) {
            stats.distribution[item] = {
              average_position: positions.reduce((a, b) => a + b, 0) / positions.length,
              count: positions.length
            };
          }
          break;

        case 'matrix':
          // Matrix response counts
          for (const val of answers) {
            if (typeof val === 'object' && val !== null) {
              for (const [row, col] of Object.entries(val)) {
                if (!stats.distribution[row]) stats.distribution[row] = {};
                stats.distribution[row][col as string] = (stats.distribution[row][col as string] || 0) + 1;
              }
            }
          }
          break;

        case 'text':
        case 'essay':
          // Text responses (limit for display)
          stats.text_responses = answers.slice(0, 50); // Limit to 50 for performance
          stats.total_text_responses = answers.length;
          break;
      }

      questionStats[question.id] = stats;
    }

    // Calculate overall statistics
    const completionTimes = allResponses
      .filter(r => r.completion_time)
      .map(r => r.completion_time);

    const avgCompletionTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : null;

    // Calculate completion rate (started vs submitted)
    const { count: totalStarted } = await tq
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', surveyId);

    const completionRate = totalStarted && totalStarted > 0
      ? Math.round((totalResponses / totalStarted) * 100)
      : 0;

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        survey_type: survey.survey_type,
        is_anonymous: survey.is_anonymous,
        created_at: survey.created_at
      },
      summary: {
        total_responses: totalResponses,
        in_progress: inProgressCount || 0,
        completion_rate: completionRate,
        avg_completion_time: avgCompletionTime
      },
      question_stats: questionStats,
      cached_analytics: cachedAnalytics,
      last_computed: cachedAnalytics?.last_computed_at || null
    });
  } catch (error) {
    console.error('Survey analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/surveys/[id]/analytics
 * Recompute analytics for a survey
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check permission
    const { data: survey } = await tq
      .from('surveys')
      .select('id, creator_id')
      .eq('id', surveyId)
      .single();

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const isCreator = userProfile.id === survey.creator_id;
    const isAdmin = ['admin', 'super_admin'].includes(userProfile.role);

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Trigger analytics recomputation
    try {
      await tq.raw.rpc('compute_survey_analytics', { p_survey_id: surveyId });
    } catch (rpcError) {
      console.warn('RPC failed, analytics will be computed on next GET:', rpcError);
    }

    return NextResponse.json({ success: true, message: 'Analytics recomputation triggered' });
  } catch (error) {
    console.error('Survey analytics POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
