import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/admin/shared-courses/incoming
 *
 * Admin view of every share visible to this tenant, with acceptance status
 * merged in. Includes:
 *   - targeted shares (target_tenant_id = this tenant) — always with an
 *     acceptance row (auto-created at share creation)
 *   - network-wide shares (target_tenant_id IS NULL) — acceptance rows may
 *     not exist yet; we synthesise 'pending' for display purposes and lazily
 *     insert a pending row per share so the Accept/Decline actions have
 *     something to upsert against.
 *
 * Response shape matches the old incoming list used by the student catalogue
 * (SharedCourse[] shape) plus an `acceptance` object per row.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile!.role, ['super_admin', 'tenant_admin', 'admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // All active non-revoked shares visible to this tenant
    const { data: shares, error } = await tq.raw
      .from('course_shares')
      .select(`
        id, course_id, source_tenant_id, permission,
        can_enroll, can_add_supplemental_content, can_schedule_live_sessions,
        can_post_grades, allow_fork,
        created_at, target_tenant_id,
        source_tenant:tenants!course_shares_source_tenant_id_fkey(id, name, slug),
        course:courses!course_shares_course_id_fkey!inner(
          id, title, description, thumbnail, difficulty,
          subject_area, estimated_duration, modality, published
        )
      `)
      .is('revoked_at', null)
      .or(`target_tenant_id.is.null,target_tenant_id.eq.${tenantId}`)
      .neq('source_tenant_id', tenantId)
      .eq('course.published', true);

    if (error) {
      console.error('Incoming shares GET error:', error);
      return NextResponse.json({ error: 'Failed to load incoming shares' }, { status: 500 });
    }

    const rows = (shares || []) as any[];
    if (rows.length === 0) return NextResponse.json({ shares: [] });

    // Load existing acceptances
    const { data: acceptances } = await tq.raw
      .from('shared_course_acceptances')
      .select('id, course_share_id, status, accepted_at, declined_at, decline_reason, accepted_by, declined_by')
      .eq('accepting_tenant_id', tenantId)
      .in('course_share_id', rows.map((s) => s.id));

    const acceptanceMap = new Map<string, any>(
      (acceptances || []).map((a: any) => [a.course_share_id, a])
    );

    // For global shares (target_tenant_id IS NULL) without an acceptance row,
    // lazily create one so accept/decline has a target.
    const missingRows = rows.filter(
      (s) => s.target_tenant_id === null && !acceptanceMap.has(s.id)
    );
    if (missingRows.length > 0) {
      const inserts = missingRows.map((s) => ({
        course_share_id: s.id,
        accepting_tenant_id: tenantId,
        status: 'pending',
      }));
      const { data: inserted } = await tq.raw
        .from('shared_course_acceptances')
        .upsert(inserts, { onConflict: 'course_share_id,accepting_tenant_id', ignoreDuplicates: true })
        .select('id, course_share_id, status, accepted_at, declined_at, decline_reason, accepted_by, declined_by');
      for (const a of (inserted || []) as any[]) {
        acceptanceMap.set(a.course_share_id, a);
      }
    }

    // Lesson counts (published) for catalogue cards
    const courseIds = rows.map((s) => s.course_id);
    const { data: lessonRows } = await tq.raw
      .from('lessons')
      .select('course_id')
      .in('course_id', courseIds)
      .eq('published', true);
    const lessonCount = new Map<string, number>();
    for (const l of (lessonRows || []) as any[]) {
      lessonCount.set(l.course_id, (lessonCount.get(l.course_id) || 0) + 1);
    }

    const result = rows.map((s) => {
      const acceptance =
        acceptanceMap.get(s.id) ||
        // Fallback for targeted shares where the migration backfill didn't
        // reach (shouldn't happen post-035) — treat as pending so admins can
        // still act on it.
        { status: 'pending', accepted_at: null, declined_at: null, decline_reason: null };
      return {
        share_id: s.id,
        course_id: s.course_id,
        permission: s.permission,
        can_enroll: s.can_enroll ?? s.permission === 'enroll',
        can_add_supplemental_content: !!s.can_add_supplemental_content,
        can_schedule_live_sessions: !!s.can_schedule_live_sessions,
        can_post_grades: !!s.can_post_grades,
        allow_fork: !!s.allow_fork,
        source_tenant: s.source_tenant,
        course: {
          ...s.course,
          lesson_count: lessonCount.get(s.course_id) || 0,
        },
        target_scope: s.target_tenant_id === null ? 'network' : 'targeted',
        shared_at: s.created_at,
        acceptance: {
          status: acceptance.status,
          accepted_at: acceptance.accepted_at,
          declined_at: acceptance.declined_at,
          decline_reason: acceptance.decline_reason,
        },
      };
    });

    return NextResponse.json({ shares: result });
  } catch (error) {
    console.error('Incoming shares GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
