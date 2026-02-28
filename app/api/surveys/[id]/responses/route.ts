import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/surveys/[id]/responses
 * Get all responses for a survey (admin/instructor only)
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

    // Check survey exists and user has permission to view responses
    const { data: survey } = await tq
      .from('surveys')
      .select('id, creator_id, is_anonymous')
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

    // Build query - if anonymous, don't include respondent details
    const query = tq
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        respondent_id,
        course_id,
        started_at,
        submitted_at,
        answers,
        status,
        completion_time,
        created_at
      `)
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false, nullsFirst: false });

    const { data: responses, error } = await query;

    if (error) {
      console.error('Error fetching responses:', error);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }

    // If not anonymous, fetch respondent names
    let responsesWithNames = responses || [];
    if (!survey.is_anonymous && responses && responses.length > 0) {
      const respondentIds = [...new Set(responses.filter(r => r.respondent_id).map(r => r.respondent_id))];

      if (respondentIds.length > 0) {
        const { data: users } = await tq
          .from('users')
          .select('id, name, email')
          .in('id', respondentIds);

        const userMap = new Map(users?.map(u => [u.id, u]) || []);

        responsesWithNames = responses.map(r => ({
          ...r,
          respondent: r.respondent_id ? userMap.get(r.respondent_id) : null
        }));
      }
    }

    return NextResponse.json({
      responses: responsesWithNames,
      is_anonymous: survey.is_anonymous
    });
  } catch (error) {
    console.error('Survey responses GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/surveys/[id]/responses
 * Start a new survey response
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId } = await params;

    const authResult = await authenticateUser(request);
    // Allow anonymous responses if survey is anonymous
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check survey exists and is available
    const { data: survey } = await tq
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    if (!survey.published) {
      return NextResponse.json({ error: 'Survey is not available' }, { status: 400 });
    }

    // Check availability dates
    const now = new Date();
    if (survey.available_from && new Date(survey.available_from) > now) {
      return NextResponse.json({ error: 'Survey is not yet available' }, { status: 400 });
    }
    if (survey.available_until && new Date(survey.available_until) < now) {
      return NextResponse.json({ error: 'Survey is no longer available' }, { status: 400 });
    }

    const respondentId = authResult.success ? authResult.userProfile.id : null;

    // Check if user has already responded (if not allowing multiple responses)
    if (!survey.allow_multiple_responses && respondentId) {
      const { data: existingResponse } = await tq
        .from('survey_responses')
        .select('id, status')
        .eq('survey_id', surveyId)
        .eq('respondent_id', respondentId)
        .single();

      if (existingResponse) {
        if (existingResponse.status === 'submitted') {
          return NextResponse.json({
            error: 'You have already completed this survey',
            existing_response_id: existingResponse.id
          }, { status: 400 });
        }
        // Return existing in-progress response
        return NextResponse.json({
          response: existingResponse,
          message: 'Continuing existing response'
        });
      }
    }

    const body = await request.json().catch(() => ({}));

    // Create new response
    const { data: response, error } = await tq
      .from('survey_responses')
      .insert({
        survey_id: surveyId,
        respondent_id: survey.is_anonymous ? null : respondentId,
        course_id: body.course_id || survey.course_id || null,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        answers: []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating response:', error);
      return NextResponse.json({ error: 'Failed to start survey' }, { status: 500 });
    }

    return NextResponse.json({ response }, { status: 201 });
  } catch (error) {
    console.error('Survey responses POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
