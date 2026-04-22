import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

/**
 * GET /api/shared-courses
 * List courses shared WITH this tenant (student/staff catalog view)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Governance: if this tenant has disabled consuming regional shares, return empty
    const { data: currentTenant } = await tq.raw
      .from('tenants')
      .select('regional_catalogue_consume_enabled')
      .eq('id', tenantId)
      .single();
    if (currentTenant && currentTenant.regional_catalogue_consume_enabled === false) {
      return NextResponse.json({ courses: [], governance_disabled: true });
    }

    // Student catalogue: only return shares the caller's tenant has ACCEPTED.
    // Pending/declined/unreviewed global shares stay out of the catalogue
    // until an admin explicitly accepts them.
    const { data: acceptedAcceptances } = await tq.raw
      .from('shared_course_acceptances')
      .select('course_share_id')
      .eq('accepting_tenant_id', tenantId)
      .eq('status', 'accepted');

    const acceptedShareIds = (acceptedAcceptances || []).map((a: any) => a.course_share_id);
    if (acceptedShareIds.length === 0) {
      return NextResponse.json({ courses: [] });
    }

    // Single query: fetch shares with joined course data
    // !inner on courses filters out shares where the course is unpublished
    const { data: shares, error } = await tq.raw
      .from('course_shares')
      .select(`
        id,
        course_id,
        source_tenant_id,
        permission,
        can_enroll,
        can_add_supplemental_content,
        can_schedule_live_sessions,
        can_post_grades,
        allow_fork,
        created_at,
        source_tenant:tenants!course_shares_source_tenant_id_fkey(id, name, slug),
        course:courses!course_shares_course_id_fkey!inner(
          id, title, description, thumbnail, difficulty,
          subject_area, estimated_duration, modality
        )
      `)
      .in('id', acceptedShareIds)
      .is('revoked_at', null)
      .neq('source_tenant_id', tenantId)
      .eq('course.published', true);

    if (error) {
      console.error('Error fetching shared courses:', error);
      return NextResponse.json({ error: 'Failed to fetch shared courses' }, { status: 500 });
    }

    if (!shares || shares.length === 0) {
      return NextResponse.json({ courses: [] });
    }

    const courseIds = shares.map((s: any) => s.course_id);

    // Two parallel batch queries: enrollments + lesson counts
    const [enrollmentsResult, lessonCountsResult] = await Promise.all([
      tq
        .from('cross_tenant_enrollments')
        .select('id, status, progress_percentage, source_course_id')
        .in('source_course_id', courseIds)
        .eq('student_id', authResult.user.id),
      tq.raw
        .from('lessons')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('published', true),
    ]);

    // Index enrollments by course_id for O(1) lookup
    const enrollmentMap = new Map<string, any>(
      (enrollmentsResult.data || []).map((e: any) => [e.source_course_id, e])
    );

    // Count lessons per course
    const lessonCountMap = new Map<string, number>();
    for (const lesson of lessonCountsResult.data || []) {
      lessonCountMap.set(lesson.course_id, (lessonCountMap.get(lesson.course_id) || 0) + 1);
    }

    const enrichedShares = shares.map((share: any) => {
      const enrollment = enrollmentMap.get(share.course_id) || null;

      return {
        share_id: share.id,
        course_id: share.course_id,
        permission: share.permission,
        can_enroll: share.can_enroll ?? share.permission === 'enroll',
        can_add_supplemental_content: !!share.can_add_supplemental_content,
        can_schedule_live_sessions: !!share.can_schedule_live_sessions,
        can_post_grades: !!share.can_post_grades,
        allow_fork: !!share.allow_fork,
        source_tenant: share.source_tenant,
        course: {
          ...share.course,
          lesson_count: lessonCountMap.get(share.course_id) || 0,
        },
        enrollment: enrollment
          ? { id: enrollment.id, status: enrollment.status, progress_percentage: enrollment.progress_percentage }
          : null,
        shared_at: share.created_at,
      };
    });

    return NextResponse.json({ courses: enrichedShares });
  } catch (error) {
    console.error('Error in shared courses listing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
