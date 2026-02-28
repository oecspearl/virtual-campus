import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string; responseId: string }>;
}

/**
 * POST /api/surveys/[id]/responses/[responseId]/submit
 * Submit a survey response
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId, responseId } = await params;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Fetch existing response
    const { data: existingResponse, error: fetchError } = await tq
      .from('survey_responses')
      .select('*')
      .eq('id', responseId)
      .eq('survey_id', surveyId)
      .single();

    if (fetchError || !existingResponse) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    // Can only submit in-progress responses
    if (existingResponse.status === 'submitted') {
      return NextResponse.json({ error: 'Response already submitted' }, { status: 400 });
    }

    // Get survey to validate required questions
    const { data: survey } = await tq
      .from('surveys')
      .select(`
        id,
        thank_you_message,
        survey_questions(id, required)
      `)
      .eq('id', surveyId)
      .single();

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Get final answers from request body (or use existing)
    const body = await request.json().catch(() => ({}));
    const answers = body.answers || existingResponse.answers || [];

    // Validate required questions are answered
    const requiredQuestionIds = survey.survey_questions
      ?.filter((q: any) => q.required)
      .map((q: any) => q.id) || [];

    const answeredQuestionIds = answers.map((a: any) => a.question_id);

    const missingRequired = requiredQuestionIds.filter(
      (id: string) => !answeredQuestionIds.includes(id)
    );

    if (missingRequired.length > 0) {
      return NextResponse.json({
        error: 'Please answer all required questions',
        missing_questions: missingRequired
      }, { status: 400 });
    }

    // Calculate completion time
    const startTime = new Date(existingResponse.started_at).getTime();
    const completionTime = Math.round((Date.now() - startTime) / 1000);

    // Submit the response
    const { data: response, error } = await tq
      .from('survey_responses')
      .update({
        answers,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        completion_time: completionTime
      })
      .eq('id', responseId)
      .select()
      .single();

    if (error) {
      console.error('Error submitting response:', error);
      return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
    }

    // Trigger analytics computation (via database function if available)
    try {
      await tq.raw.rpc('compute_survey_analytics', { p_survey_id: surveyId });
    } catch (analyticsError) {
      // Non-fatal - analytics can be computed later
      console.warn('Analytics computation skipped:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      response,
      thank_you_message: survey.thank_you_message || 'Thank you for completing this survey!'
    });
  } catch (error) {
    console.error('Survey submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
