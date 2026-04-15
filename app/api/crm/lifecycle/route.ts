import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { updateStage, LifecycleStage } from '@/lib/crm/lifecycle-service';

const VALID_STAGES: LifecycleStage[] = [
  'prospect', 'onboarding', 'active', 'at_risk',
  're_engagement', 'completing', 'alumni'
];

/**
 * GET /api/crm/lifecycle
 * List all students with their current lifecycle stage.
 * Query params: stage, course_id, search, page, limit
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
    const stage = searchParams.get('stage');
    const courseId = searchParams.get('course_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get all students with role 'student'
    let studentsQuery = tq
      .from('users')
      .select('id, name, email, created_at', { count: 'exact' })
      .eq('role', 'student');

    if (search) {
      studentsQuery = studentsQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // If filtering by course, get enrolled student IDs first
    if (courseId) {
      const { data: enrollments } = await tq
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId)
        .eq('status', 'active');

      if (!enrollments || enrollments.length === 0) {
        return NextResponse.json({ students: [], total: 0, page });
      }

      studentsQuery = studentsQuery.in('id', enrollments.map(e => e.student_id));
    }

    const { data: students, count, error } = await studentsQuery
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('CRM Lifecycle: Failed to fetch students', error);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ students: [], total: 0, page });
    }

    // Get current lifecycle stage for each student (latest entry)
    const studentIds = students.map(s => s.id);
    const { data: lifecycleData } = await tq
      .from('crm_student_lifecycle')
      .select('student_id, stage, stage_changed_at')
      .in('student_id', studentIds)
      .order('stage_changed_at', { ascending: false });

    // Deduplicate to latest stage per student
    const stageMap = new Map<string, { stage: string; stage_changed_at: string }>();
    for (const row of (lifecycleData || [])) {
      if (!stageMap.has(row.student_id)) {
        stageMap.set(row.student_id, { stage: row.stage, stage_changed_at: row.stage_changed_at });
      }
    }

    // Get latest risk scores
    const { data: riskData } = await tq
      .from('student_risk_scores')
      .select('student_id, risk_level, risk_score')
      .in('student_id', studentIds)
      .order('calculated_at', { ascending: false });

    const riskMap = new Map<string, { risk_level: string; risk_score: number }>();
    for (const row of (riskData || [])) {
      if (!riskMap.has(row.student_id)) {
        riskMap.set(row.student_id, { risk_level: row.risk_level, risk_score: row.risk_score });
      }
    }

    // Build response
    let result = students.map(s => ({
      student_id: s.id,
      student_name: s.name,
      email: s.email,
      stage: stageMap.get(s.id)?.stage || null,
      stage_changed_at: stageMap.get(s.id)?.stage_changed_at || null,
      risk_level: riskMap.get(s.id)?.risk_level || null,
      risk_score: riskMap.get(s.id)?.risk_score || null,
    }));

    // Filter by stage if specified (post-pagination filtering)
    if (stage) {
      result = result.filter(s => s.stage === stage);
    }

    return NextResponse.json({
      students: result,
      total: count || 0,
      filtered_count: stage ? result.length : undefined,
      page,
    });
  } catch (error: any) {
    console.error('CRM Lifecycle: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/lifecycle
 * Update a student's lifecycle stage.
 * Body: { student_id, stage, reason? }
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
    const { student_id, stage, reason } = body;

    if (!student_id || !stage) {
      return NextResponse.json({ error: 'student_id and stage are required' }, { status: 400 });
    }

    if (!VALID_STAGES.includes(stage as LifecycleStage)) {
      return NextResponse.json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` }, { status: 400 });
    }

    const lifecycle = await updateStage(
      student_id,
      stage as LifecycleStage,
      authResult.userProfile.id,
      reason || `Manually set by ${authResult.userProfile.name}`
    );

    return NextResponse.json({ success: true, lifecycle });
  } catch (error: any) {
    console.error('CRM Lifecycle: Update error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
