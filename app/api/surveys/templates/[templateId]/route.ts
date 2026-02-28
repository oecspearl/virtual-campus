import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

/**
 * GET /api/surveys/templates/[templateId]
 * Get a single template
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: template, error } = await tq
      .from('survey_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check access - system templates are public, user templates are private
    if (!template.is_system && template.creator_id !== userProfile.id) {
      const isAdmin = ['admin', 'super_admin'].includes(userProfile.role);
      if (!isAdmin) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Survey template GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/surveys/templates/[templateId]
 * Update a template
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check template exists and user owns it
    const { data: existingTemplate } = await tq
      .from('survey_templates')
      .select('id, creator_id, is_system')
      .eq('id', templateId)
      .single();

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Cannot edit system templates
    if (existingTemplate.is_system) {
      return NextResponse.json({ error: 'Cannot modify system templates' }, { status: 403 });
    }

    // Only owner or admin can edit
    const isOwner = existingTemplate.creator_id === userProfile.id;
    const isAdmin = ['admin', 'super_admin'].includes(userProfile.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, survey_type, questions } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (survey_type !== undefined) updateData.survey_type = survey_type;
    if (questions !== undefined) updateData.questions = questions;

    const { data: template, error } = await tq
      .from('survey_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Survey template PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/surveys/templates/[templateId]
 * Delete a template
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check template exists
    const { data: existingTemplate } = await tq
      .from('survey_templates')
      .select('id, creator_id, is_system')
      .eq('id', templateId)
      .single();

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Cannot delete system templates
    if (existingTemplate.is_system) {
      return NextResponse.json({ error: 'Cannot delete system templates' }, { status: 403 });
    }

    // Only owner or admin can delete
    const isOwner = existingTemplate.creator_id === userProfile.id;
    const isAdmin = ['admin', 'super_admin'].includes(userProfile.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await tq
      .from('survey_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Survey template DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
