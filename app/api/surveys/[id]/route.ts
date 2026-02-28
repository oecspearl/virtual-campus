import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/surveys/[id]
 * Get a single survey with questions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId } = await params;

    const authResult = await authenticateUser(request);
    const isAuthenticated = authResult.success;
    const userProfile = authResult.userProfile;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Fetch survey with questions
    const { data: survey, error } = await tq
      .from('surveys')
      .select(`
        *,
        survey_questions(
          id,
          type,
          question_text,
          description,
          "order",
          required,
          options,
          conditional_logic,
          category,
          created_at
        ),
        courses:course_id(id, title),
        lessons:lesson_id(id, title),
        creator:creator_id(id, name, email)
      `)
      .eq('id', surveyId)
      .single();

    if (error || !survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Check access
    const isCreator = userProfile?.id === survey.creator_id;
    const isAdmin = userProfile?.role && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (!survey.published && !isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Get response count
    const { count: responseCount } = await tq
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', surveyId)
      .eq('status', 'submitted');

    // Check if current user has already responded (for non-anonymous)
    let hasResponded = false;
    if (isAuthenticated && userProfile) {
      const { data: existingResponse } = await tq
        .from('survey_responses')
        .select('id')
        .eq('survey_id', surveyId)
        .eq('respondent_id', userProfile.id)
        .eq('status', 'submitted')
        .single();

      hasResponded = !!existingResponse;
    }

    // Sort questions by order
    const sortedQuestions = survey.survey_questions?.sort((a: any, b: any) => a.order - b.order) || [];

    return NextResponse.json({
      ...survey,
      survey_questions: sortedQuestions,
      response_count: responseCount || 0,
      has_responded: hasResponded,
      can_respond: !hasResponded || survey.allow_multiple_responses
    });
  } catch (error) {
    console.error('Survey GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/surveys/[id]
 * Update a survey
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if survey exists and user has permission
    const { data: existingSurvey } = await tq
      .from('surveys')
      .select('id, creator_id')
      .eq('id', surveyId)
      .single();

    if (!existingSurvey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Only creator or admin can update
    const isCreator = userProfile.id === existingSurvey.creator_id;
    const isAdmin = ['admin', 'super_admin'].includes(userProfile.role);

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      instructions,
      survey_type,
      is_anonymous,
      allow_multiple_responses,
      available_from,
      available_until,
      randomize_questions,
      show_progress_bar,
      thank_you_message,
      published,
      course_id,
      lesson_id
    } = body;

    // Build update object with only provided fields
    const updateData: any = { updated_at: new Date().toISOString() };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (survey_type !== undefined) updateData.survey_type = survey_type;
    if (is_anonymous !== undefined) updateData.is_anonymous = is_anonymous;
    if (allow_multiple_responses !== undefined) updateData.allow_multiple_responses = allow_multiple_responses;
    if (available_from !== undefined) updateData.available_from = available_from || null;
    if (available_until !== undefined) updateData.available_until = available_until || null;
    if (randomize_questions !== undefined) updateData.randomize_questions = randomize_questions;
    if (show_progress_bar !== undefined) updateData.show_progress_bar = show_progress_bar;
    if (thank_you_message !== undefined) updateData.thank_you_message = thank_you_message;
    if (published !== undefined) updateData.published = published;
    if (course_id !== undefined) updateData.course_id = course_id || null;
    if (lesson_id !== undefined) updateData.lesson_id = lesson_id || null;

    const { data: survey, error } = await tq
      .from('surveys')
      .update(updateData)
      .eq('id', surveyId)
      .select(`
        *,
        survey_questions(*)
      `)
      .single();

    if (error) {
      console.error('Error updating survey:', error);
      return NextResponse.json({ error: 'Failed to update survey' }, { status: 500 });
    }

    return NextResponse.json({ survey });
  } catch (error) {
    console.error('Survey PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/surveys/[id]
 * Delete a survey
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if survey exists and user has permission
    const { data: existingSurvey } = await tq
      .from('surveys')
      .select('id, creator_id, title')
      .eq('id', surveyId)
      .single();

    if (!existingSurvey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Only creator or admin can delete
    const isCreator = userProfile.id === existingSurvey.creator_id;
    const isAdmin = ['admin', 'super_admin'].includes(userProfile.role);

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete survey (cascades to questions, responses, analytics)
    const { error } = await tq
      .from('surveys')
      .delete()
      .eq('id', surveyId);

    if (error) {
      console.error('Error deleting survey:', error);
      return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Survey deleted' });
  } catch (error) {
    console.error('Survey DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
