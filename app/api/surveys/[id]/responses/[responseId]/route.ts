import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string; responseId: string }>;
}

/**
 * GET /api/surveys/[id]/responses/[responseId]
 * Get a single response
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId, responseId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Fetch response
    const { data: response, error } = await tq
      .from('survey_responses')
      .select('*')
      .eq('id', responseId)
      .eq('survey_id', surveyId)
      .single();

    if (error || !response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    // Check access - own response or admin
    const isOwner = response.respondent_id === userProfile.id;
    const isAdmin = ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    // Check if user is survey creator
    const { data: survey } = await tq
      .from('surveys')
      .select('creator_id')
      .eq('id', surveyId)
      .single();

    const isCreator = survey?.creator_id === userProfile.id;

    if (!isOwner && !isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Survey response GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/surveys/[id]/responses/[responseId]
 * Update response answers (save progress)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Can only update in-progress responses
    if (existingResponse.status === 'submitted') {
      return NextResponse.json({ error: 'Cannot modify submitted response' }, { status: 400 });
    }

    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers array is required' }, { status: 400 });
    }

    const { data: response, error } = await tq
      .from('survey_responses')
      .update({ answers })
      .eq('id', responseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating response:', error);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Survey response PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/surveys/[id]/responses/[responseId]
 * Delete a response (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId, responseId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Only admin can delete responses
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await tq
      .from('survey_responses')
      .delete()
      .eq('id', responseId)
      .eq('survey_id', surveyId);

    if (error) {
      console.error('Error deleting response:', error);
      return NextResponse.json({ error: 'Failed to delete response' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Response deleted' });
  } catch (error) {
    console.error('Survey response DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
