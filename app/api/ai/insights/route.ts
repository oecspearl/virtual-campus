import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { generateStudentInsights, generateCourseInsights, storeInsights } from '@/lib/ai/insights-generator';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/ai/insights
 * Get AI-generated insights
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: { user }, error: authError } = await tq.raw.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'student';

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entity_type') as 'student' | 'course' | null;
    const entityId = searchParams.get('entity_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Students can only view their own insights
    if (userRole === 'student' && entityType === 'student' && entityId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = tq
      .from('ai_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    // Filter by user role
    if (userRole === 'student') {
      query = query.eq('entity_type', 'student').eq('entity_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Error in insights API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/insights
 * Generate new insights
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: { user }, error: authError } = await tq.raw.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'student';

    // Only instructors and admins can trigger insight generation
    if (!hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { entity_type, entity_id } = body;

    if (!entity_type || !entity_id) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }

    let insights;

    if (entity_type === 'student') {
      insights = await generateStudentInsights(entity_id, body.course_id);
    } else if (entity_type === 'course') {
      insights = await generateCourseInsights(entity_id);
    } else {
      return NextResponse.json(
        { error: 'Invalid entity_type' },
        { status: 400 }
      );
    }

    // Store insights
    await storeInsights(insights);

    return NextResponse.json({ data: insights });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


