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
 * Share a course with other tenants
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

    const { course_id, target_tenant_id, permission } = body;

    if (!course_id) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

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

    // If target_tenant_id specified, verify it exists
    if (target_tenant_id) {
      const { data: targetTenant } = await tq.raw
        .from('tenants')
        .select('id')
        .eq('id', target_tenant_id)
        .eq('status', 'active')
        .single();

      if (!targetTenant) {
        return NextResponse.json({ error: 'Target tenant not found or inactive' }, { status: 404 });
      }

      if (target_tenant_id === tenantId) {
        return NextResponse.json({ error: 'Cannot share a course with your own tenant' }, { status: 400 });
      }
    }

    // Check for existing active share
    let existingQuery = tq.raw
      .from('course_shares')
      .select('id, revoked_at')
      .eq('course_id', course_id)
      .eq('source_tenant_id', tenantId);

    if (target_tenant_id) {
      existingQuery = existingQuery.eq('target_tenant_id', target_tenant_id);
    } else {
      existingQuery = existingQuery.is('target_tenant_id', null);
    }

    const { data: existing } = await existingQuery.single();

    if (existing && !existing.revoked_at) {
      return NextResponse.json({ error: 'This course is already shared with this target' }, { status: 409 });
    }

    // If there's a revoked share, reactivate it
    if (existing && existing.revoked_at) {
      const { data: reactivated, error: reactivateError } = await tq.raw
        .from('course_shares')
        .update({
          revoked_at: null,
          permission: permission || 'enroll',
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
        return NextResponse.json({ error: 'Failed to reactivate share' }, { status: 500 });
      }

      return NextResponse.json({ share: reactivated, reactivated: true });
    }

    // Create new share
    const { data: share, error: shareError } = await tq.raw
      .from('course_shares')
      .insert({
        course_id,
        source_tenant_id: tenantId,
        target_tenant_id: target_tenant_id || null,
        permission: permission || 'enroll',
        shared_by: authResult.user.id,
        title_snapshot: course.title,
        description_snapshot: course.description,
        thumbnail_snapshot: course.thumbnail,
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating share:', shareError);
      return NextResponse.json({ error: 'Failed to share course' }, { status: 500 });
    }

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error('Error in shared courses POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
