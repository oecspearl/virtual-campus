import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

/**
 * GET /api/surveys/templates
 * List available survey templates
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { searchParams } = new URL(request.url);
    const surveyType = searchParams.get('survey_type');
    const includeSystem = searchParams.get('include_system') !== 'false';

    // Build query
    let query = tq
      .from('survey_templates')
      .select(`
        id,
        name,
        description,
        survey_type,
        questions,
        is_system,
        creator_id,
        created_at
      `)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    // Filter by survey type
    if (surveyType) {
      query = query.eq('survey_type', surveyType);
    }

    // Include system templates and user's own templates
    if (includeSystem) {
      query = query.or(`is_system.eq.true,creator_id.eq.${userProfile.id}`);
    } else {
      query = query.eq('creator_id', userProfile.id);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('Survey templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/surveys/templates
 * Create a new survey template
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    // Only instructors and admins can create templates
    if (!['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const body = await request.json();

    const { name, description, survey_type, questions } = body;

    if (!name || !questions || !Array.isArray(questions)) {
      return NextResponse.json({
        error: 'Name and questions are required'
      }, { status: 400 });
    }

    // Create template
    const { data: template, error } = await tq
      .from('survey_templates')
      .insert({
        name,
        description: description || null,
        survey_type: survey_type || 'custom',
        questions,
        is_system: false, // User templates are never system templates
        creator_id: userProfile.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Survey templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
