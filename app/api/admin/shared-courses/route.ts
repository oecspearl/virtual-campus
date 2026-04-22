import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/admin/shared-courses
 * List courses shared BY this tenant (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get all shares originating from this tenant
    const { data: shares, error } = await tq.raw
      .from('course_shares')
      .select(`
        id,
        course_id,
        source_tenant_id,
        target_tenant_id,
        permission,
        can_enroll,
        can_add_supplemental_content,
        can_schedule_live_sessions,
        can_post_grades,
        allow_fork,
        shared_by,
        title_snapshot,
        description_snapshot,
        thumbnail_snapshot,
        created_at,
        revoked_at,
        course:courses!course_shares_course_id_fkey(id, title, published, thumbnail),
        target_tenant:tenants!course_shares_target_tenant_id_fkey(id, name, slug),
        sharer:users!course_shares_shared_by_fkey(id, name, email)
      `)
      .eq('source_tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shared courses:', error);
      return NextResponse.json({ error: 'Failed to fetch shared courses' }, { status: 500 });
    }

    // Get enrollment counts per share
    const shareIds = (shares || []).map(s => s.id);
    const enrollmentCounts: Record<string, number> = {};

    if (shareIds.length > 0) {
      const { data: counts } = await tq.raw
        .from('cross_tenant_enrollments')
        .select('course_share_id')
        .in('course_share_id', shareIds)
        .eq('status', 'active');

      if (counts) {
        for (const c of counts) {
          enrollmentCounts[c.course_share_id] = (enrollmentCounts[c.course_share_id] || 0) + 1;
        }
      }
    }

    const result = (shares || []).map(s => ({
      ...s,
      enrollment_count: enrollmentCounts[s.id] || 0,
    }));

    return NextResponse.json({ shares: result });
  } catch (error) {
    console.error('Error in shared courses GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/shared-courses
 * Share a course with one or more target tenants, or share globally.
 *
 * Payload shapes supported:
 *   { course_id, share_globally: true, permission? }
 *   { course_id, target_tenant_ids: string[], permission? }
 *   { course_id, target_tenant_id: string | null, permission? }  // legacy single-target
 *
 * Returns a per-target results array so partial failures are surfaced
 * (e.g. one tenant already has an active share, another is created).
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const body = await request.json();

    const { course_id, target_tenant_id, target_tenant_ids, share_globally, permission } = body;

    if (!course_id) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    // Resolve the granular permission flags. Callers can either pass explicit
    // booleans or the legacy `permission` string — we map the legacy values.
    const flags = {
      can_enroll:
        body.can_enroll !== undefined ? !!body.can_enroll : permission === 'enroll' || permission === undefined,
      can_add_supplemental_content: !!body.can_add_supplemental_content,
      can_schedule_live_sessions: !!body.can_schedule_live_sessions,
      can_post_grades: !!body.can_post_grades,
      allow_fork: !!body.allow_fork,
    };
    // Legacy summary column: preserve the old values when explicitly passed,
    // otherwise mark the share as using granular flags.
    const legacyPermission: 'enroll' | 'view_only' | 'granular' =
      permission === 'enroll' || permission === 'view_only' ? permission : 'granular';

    // Normalize payload into a list of targets (null = global)
    let targets: (string | null)[] = [];
    if (share_globally === true) {
      targets = [null];
    } else if (Array.isArray(target_tenant_ids)) {
      targets = target_tenant_ids.filter((t): t is string => typeof t === 'string' && t.length > 0);
      if (targets.length === 0) {
        return NextResponse.json(
          { error: 'Select at least one tenant, or set share_globally: true' },
          { status: 400 }
        );
      }
    } else {
      // Legacy single-target form
      targets = [target_tenant_id || null];
    }

    // Dedupe
    targets = Array.from(new Set(targets));

    // Verify the course exists in this tenant and is published
    const { data: course, error: courseError } = await tq
      .from('courses')
      .select('id, title, description, thumbnail, published')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found in your tenant' }, { status: 404 });
    }

    if (!course.published) {
      return NextResponse.json({ error: 'Only published courses can be shared' }, { status: 400 });
    }

    // If any target is global (null), verify source tenant is allowed to publish network-wide
    if (targets.includes(null)) {
      const { data: sourceTenant } = await tq.raw
        .from('tenants')
        .select('regional_catalogue_publish_enabled')
        .eq('id', tenantId)
        .single();

      if (sourceTenant && sourceTenant.regional_catalogue_publish_enabled === false) {
        return NextResponse.json(
          { error: 'Network-wide publishing is disabled for your institution. Enable it in tenant settings or share with specific institutions instead.' },
          { status: 403 }
        );
      }
    }

    // Validate each non-global target exists, is active, and isn't the source tenant
    const specificTargets = targets.filter((t): t is string => t !== null);
    if (specificTargets.length > 0) {
      if (specificTargets.includes(tenantId)) {
        return NextResponse.json({ error: 'Cannot share a course with your own tenant' }, { status: 400 });
      }

      const { data: validTenants } = await tq.raw
        .from('tenants')
        .select('id')
        .in('id', specificTargets)
        .eq('status', 'active');

      const validIds = new Set((validTenants || []).map((t) => t.id));
      const invalid = specificTargets.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `One or more target tenants not found or inactive: ${invalid.join(', ')}` },
          { status: 404 }
        );
      }
    }

    // Process each target
    type TargetResult = {
      target_tenant_id: string | null;
      status: 'created' | 'reactivated' | 'already_shared' | 'error';
      share?: unknown;
      error?: string;
    };
    const results: TargetResult[] = [];

    for (const target of targets) {
      let existingQuery = tq.raw
        .from('course_shares')
        .select('id, revoked_at')
        .eq('course_id', course_id)
        .eq('source_tenant_id', tenantId);

      if (target) {
        existingQuery = existingQuery.eq('target_tenant_id', target);
      } else {
        existingQuery = existingQuery.is('target_tenant_id', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing && !existing.revoked_at) {
        results.push({
          target_tenant_id: target,
          status: 'already_shared',
          error: 'Already shared with this target',
        });
        continue;
      }

      if (existing && existing.revoked_at) {
        const { data: reactivated, error: reactivateError } = await tq.raw
          .from('course_shares')
          .update({
            revoked_at: null,
            permission: legacyPermission,
            ...flags,
            title_snapshot: course.title,
            description_snapshot: course.description,
            thumbnail_snapshot: course.thumbnail,
            shared_by: authResult.user.id,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (reactivateError) {
          console.error('Error reactivating share:', reactivateError);
          results.push({ target_tenant_id: target, status: 'error', error: 'Failed to reactivate share' });
        } else {
          // Re-seed a pending acceptance row for the targeted tenant if absent.
          // For global shares, acceptances are created lazily on first view.
          if (target) {
            await tq.raw
              .from('shared_course_acceptances')
              .upsert(
                {
                  course_share_id: reactivated.id,
                  accepting_tenant_id: target,
                  status: 'pending',
                },
                { onConflict: 'course_share_id,accepting_tenant_id', ignoreDuplicates: true }
              );
          }
          results.push({ target_tenant_id: target, status: 'reactivated', share: reactivated });
        }
        continue;
      }

      const { data: share, error: shareError } = await tq.raw
        .from('course_shares')
        .insert({
          course_id,
          source_tenant_id: tenantId,
          target_tenant_id: target,
          permission: legacyPermission,
          ...flags,
          shared_by: authResult.user.id,
          title_snapshot: course.title,
          description_snapshot: course.description,
          thumbnail_snapshot: course.thumbnail,
        })
        .select()
        .single();

      if (shareError) {
        console.error('Error creating share:', shareError);
        results.push({ target_tenant_id: target, status: 'error', error: 'Failed to share course' });
      } else {
        // For targeted shares, seed a pending acceptance so the target admin
        // can accept or decline. Global shares (target=null) create
        // acceptances lazily when a consuming tenant first sees them.
        if (target) {
          await tq.raw
            .from('shared_course_acceptances')
            .insert({
              course_share_id: share.id,
              accepting_tenant_id: target,
              status: 'pending',
            });
        }
        results.push({ target_tenant_id: target, status: 'created', share });
      }
    }

    const created = results.filter((r) => r.status === 'created' || r.status === 'reactivated').length;
    const skipped = results.filter((r) => r.status === 'already_shared').length;
    const failed = results.filter((r) => r.status === 'error').length;

    return NextResponse.json(
      {
        results,
        summary: { created, skipped, failed, total: results.length },
      },
      { status: created > 0 ? 201 : failed > 0 ? 500 : 409 }
    );
  } catch (error) {
    console.error('Error in shared courses POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
