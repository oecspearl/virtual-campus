import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

const VALID_TYPES = ['note', 'email', 'call', 'meeting', 'intervention', 'system'];

/**
 * GET /api/crm/interactions
 * List interactions, optionally filtered by student_id, type, course_id.
 * Query params: student_id, type, course_id, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const type = searchParams.get('type');
    const courseId = searchParams.get('course_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('crm_interactions')
      .select('*, users!crm_interactions_created_by_fkey(name)', { count: 'exact' });

    if (studentId) query = query.eq('student_id', studentId);
    if (type) query = query.eq('interaction_type', type);
    if (courseId) query = query.eq('course_id', courseId);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('CRM Interactions: Fetch error', error);
      return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
    }

    const interactions = (data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      created_by: row.created_by,
      created_by_name: row.users?.name || null,
      interaction_type: row.interaction_type,
      subject: row.subject,
      body: row.body,
      course_id: row.course_id,
      is_private: row.is_private,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ interactions, total: count || 0, page });
  } catch (error: any) {
    console.error('CRM Interactions: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/interactions
 * Create a new interaction/note.
 * Body: { student_id, interaction_type, subject, body?, course_id?, is_private?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, interaction_type, subject, body: interactionBody, course_id, is_private, metadata } = body;

    if (!student_id || !interaction_type || !subject) {
      return NextResponse.json({ error: 'student_id, interaction_type, and subject are required' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(interaction_type)) {
      return NextResponse.json({ error: `Invalid interaction_type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('crm_interactions')
      .insert({
        student_id,
        created_by: authResult.userProfile.id,
        interaction_type,
        subject,
        body: interactionBody || null,
        course_id: course_id || null,
        is_private: is_private || false,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('CRM Interactions: Create error', error);
      return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true, interaction: data });
  } catch (error: any) {
    console.error('CRM Interactions: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
