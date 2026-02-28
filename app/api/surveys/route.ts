import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

/**
 * GET /api/surveys
 * List surveys with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const lessonId = searchParams.get('lesson_id');
    const published = searchParams.get('published');
    const surveyType = searchParams.get('type');
    const creatorId = searchParams.get('creator_id');

    const authResult = await authenticateUser(request);
    const isAuthenticated = authResult.success;
    const userProfile = authResult.userProfile;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('surveys')
      .select(`
        id,
        title,
        description,
        survey_type,
        is_anonymous,
        available_from,
        available_until,
        published,
        course_id,
        lesson_id,
        creator_id,
        created_at,
        updated_at,
        courses:course_id(id, title),
        lessons:lesson_id(id, title)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    if (surveyType) {
      query = query.eq('survey_type', surveyType);
    }

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    // Non-authenticated users or students only see published surveys
    if (!isAuthenticated || userProfile?.role === 'student') {
      query = query.eq('published', true);
    } else if (published !== null) {
      query = query.eq('published', published === 'true');
    }

    const { data: surveys, error } = await query;

    if (error) {
      console.error('Error fetching surveys:', error);
      return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 });
    }

    // Get response counts for each survey
    const surveyIds = surveys?.map(s => s.id) || [];
    let responseCounts: Record<string, number> = {};

    if (surveyIds.length > 0) {
      const { data: counts } = await tq
        .from('survey_responses')
        .select('survey_id')
        .in('survey_id', surveyIds)
        .eq('status', 'submitted');

      if (counts) {
        responseCounts = counts.reduce((acc, r) => {
          acc[r.survey_id] = (acc[r.survey_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Get question counts
    let questionCounts: Record<string, number> = {};
    if (surveyIds.length > 0) {
      const { data: qCounts } = await tq
        .from('survey_questions')
        .select('survey_id')
        .in('survey_id', surveyIds);

      if (qCounts) {
        questionCounts = qCounts.reduce((acc, q) => {
          acc[q.survey_id] = (acc[q.survey_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Check user's response status for each survey
    const userResponses: Record<string, boolean> = {};
    if (isAuthenticated && userProfile) {
      const { data: responses } = await tq
        .from('survey_responses')
        .select('survey_id')
        .in('survey_id', surveyIds)
        .eq('respondent_id', userProfile.id)
        .eq('status', 'submitted');

      if (responses) {
        responses.forEach(r => {
          userResponses[r.survey_id] = true;
        });
      }
    }

    // Add counts and response status to surveys
    const surveysWithCounts = surveys?.map(survey => ({
      ...survey,
      response_count: responseCounts[survey.id] || 0,
      question_count: questionCounts[survey.id] || 0,
      has_responded: userResponses[survey.id] || false,
      can_respond: !userResponses[survey.id] || (survey as any).allow_multiple_responses
    }));

    return NextResponse.json({ surveys: surveysWithCounts || [] });
  } catch (error) {
    console.error('Surveys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/surveys
 * Create a new survey
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    // Only instructors, curriculum designers, and admins can create surveys
    if (!['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      instructions,
      survey_type = 'custom',
      is_anonymous = true,
      allow_multiple_responses = false,
      available_from,
      available_until,
      randomize_questions = false,
      show_progress_bar = true,
      thank_you_message = 'Thank you for your feedback!',
      published = false,
      course_id,
      lesson_id,
      questions = []
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify course exists if provided
    if (course_id) {
      const { data: course } = await tq
        .from('courses')
        .select('id')
        .eq('id', course_id)
        .single();

      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
    }

    // Verify lesson exists if provided
    if (lesson_id) {
      const { data: lesson } = await tq
        .from('lessons')
        .select('id, course_id')
        .eq('id', lesson_id)
        .single();

      if (!lesson) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }
    }

    // Create survey
    const { data: survey, error: surveyError } = await tq
      .from('surveys')
      .insert({
        title,
        description,
        instructions,
        survey_type,
        is_anonymous,
        allow_multiple_responses,
        available_from: available_from || null,
        available_until: available_until || null,
        randomize_questions,
        show_progress_bar,
        thank_you_message,
        published,
        course_id: course_id || null,
        lesson_id: lesson_id || null,
        creator_id: userProfile.id
      })
      .select()
      .single();

    if (surveyError) {
      console.error('Error creating survey:', surveyError);
      return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
    }

    // Create questions if provided
    if (questions.length > 0) {
      const questionsToInsert = questions.map((q: any, index: number) => ({
        survey_id: survey.id,
        type: q.type,
        question_text: q.question_text,
        description: q.description || null,
        order: q.order ?? index,
        required: q.required ?? true,
        options: q.options || null,
        conditional_logic: q.conditional_logic || null,
        category: q.category || null
      }));

      const { error: questionsError } = await tq
        .from('survey_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Error creating questions:', questionsError);
        // Survey was created but questions failed - return partial success
        return NextResponse.json({
          survey,
          warning: 'Survey created but some questions failed to save'
        }, { status: 201 });
      }
    }

    // Fetch complete survey with questions
    const { data: completeSurvey } = await tq
      .from('surveys')
      .select(`
        *,
        survey_questions(*)
      `)
      .eq('id', survey.id)
      .single();

    return NextResponse.json({ survey: completeSurvey }, { status: 201 });
  } catch (error) {
    console.error('Surveys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
