import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/surveys/[id]/questions
 * Get all questions for a survey
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId } = await params;

    const authResult = await authenticateUser(request);
    const isAuthenticated = authResult.success;
    const userProfile = authResult.userProfile;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if survey exists
    const { data: survey, error: surveyError } = await tq
      .from('surveys')
      .select('id, published, creator_id')
      .eq('id', surveyId)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Check access for unpublished surveys
    const isCreator = userProfile?.id === survey.creator_id;
    const isAdmin = userProfile?.role && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (!survey.published && !isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Get questions
    const { data: questions, error } = await tq
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    return NextResponse.json({ questions: questions || [] });
  } catch (error) {
    console.error('Survey questions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/surveys/[id]/questions
 * Add questions to a survey
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

    // Check if survey exists and user has permission
    const { data: survey } = await tq
      .from('surveys')
      .select('id, creator_id')
      .eq('id', surveyId)
      .single();

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Only creator or admin can add questions
    const isCreator = userProfile.id === survey.creator_id;
    const isAdmin = ['admin', 'super_admin'].includes(userProfile.role);

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { questions } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Questions array is required' }, { status: 400 });
    }

    // Get current max order
    const { data: existingQuestions } = await tq
      .from('survey_questions')
      .select('order')
      .eq('survey_id', surveyId)
      .order('order', { ascending: false })
      .limit(1);

    let nextOrder = (existingQuestions?.[0]?.order || 0) + 1;

    // Prepare questions for insert
    const questionsToInsert = questions.map((q: any) => ({
      survey_id: surveyId,
      type: q.type,
      question_text: q.question_text,
      description: q.description || null,
      order: q.order !== undefined ? q.order : nextOrder++,
      required: q.required !== undefined ? q.required : true,
      options: q.options || null,
      conditional_logic: q.conditional_logic || null,
      category: q.category || null
    }));

    const { data: insertedQuestions, error } = await tq
      .from('survey_questions')
      .insert(questionsToInsert)
      .select();

    if (error) {
      console.error('Error adding questions:', error);
      return NextResponse.json({ error: 'Failed to add questions' }, { status: 500 });
    }

    return NextResponse.json({ questions: insertedQuestions }, { status: 201 });
  } catch (error) {
    console.error('Survey questions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/surveys/[id]/questions
 * Reorder all questions in a survey
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

    const body = await request.json();
    const { question_order } = body; // Array of { id, order }

    if (!question_order || !Array.isArray(question_order)) {
      return NextResponse.json({ error: 'question_order array is required' }, { status: 400 });
    }

    // Update each question's order
    for (const item of question_order) {
      await tq
        .from('survey_questions')
        .update({ order: item.order, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('survey_id', surveyId);
    }

    // Fetch updated questions
    const { data: questions } = await tq
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('order', { ascending: true });

    return NextResponse.json({ questions: questions || [] });
  } catch (error) {
    console.error('Survey questions PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
