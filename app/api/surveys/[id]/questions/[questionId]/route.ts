import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string; questionId: string }>;
}

/**
 * GET /api/surveys/[id]/questions/[questionId]
 * Get a single question
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId, questionId } = await params;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: question, error } = await tq
      .from('survey_questions')
      .select('*')
      .eq('id', questionId)
      .eq('survey_id', surveyId)
      .single();

    if (error || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Survey question GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/surveys/[id]/questions/[questionId]
 * Update a question
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId, questionId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check survey ownership
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

    // Check question exists
    const { data: existingQuestion } = await tq
      .from('survey_questions')
      .select('id')
      .eq('id', questionId)
      .eq('survey_id', surveyId)
      .single();

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      type,
      question_text,
      description,
      order,
      required,
      options,
      conditional_logic,
      category
    } = body;

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };

    if (type !== undefined) updateData.type = type;
    if (question_text !== undefined) updateData.question_text = question_text;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (required !== undefined) updateData.required = required;
    if (options !== undefined) updateData.options = options;
    if (conditional_logic !== undefined) updateData.conditional_logic = conditional_logic;
    if (category !== undefined) updateData.category = category;

    const { data: question, error } = await tq
      .from('survey_questions')
      .update(updateData)
      .eq('id', questionId)
      .eq('survey_id', surveyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating question:', error);
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Survey question PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/surveys/[id]/questions/[questionId]
 * Delete a question
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId, questionId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check survey ownership
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

    const { error } = await tq
      .from('survey_questions')
      .delete()
      .eq('id', questionId)
      .eq('survey_id', surveyId);

    if (error) {
      console.error('Error deleting question:', error);
      return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    console.error('Survey question DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
