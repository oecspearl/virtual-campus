import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { requireAcceptedShare } from '@/lib/share-validation';
import { withIdempotency } from '@/lib/idempotency';

/**
 * POST /api/shared-courses/[id]/enroll
 * Enroll current user in a shared course (id = course_shares.id)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateUser(request);
  if (!authResult.success) {
    return createAuthResponse(authResult.error!, authResult.status!);
  }

  return withIdempotency(request, async () => {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id: shareId } = await params;

    // Validate share + require acceptance by this tenant
    const shareValidation = await requireAcceptedShare(shareId, tenantId);
    if (!shareValidation.valid) {
      return NextResponse.json({ error: shareValidation.error }, { status: 404 });
    }

    const share = shareValidation.share!;

    if (!share.can_enroll) {
      return NextResponse.json({ error: 'This shared course is view-only' }, { status: 403 });
    }

    // Verify the source course is still published
    const { data: course } = await tq.raw
      .from('courses')
      .select('id, title, published')
      .eq('id', share.course_id)
      .eq('published', true)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Source course is no longer available' }, { status: 404 });
    }

    // Check for existing enrollment
    const { data: existing } = await tq
      .from('cross_tenant_enrollments')
      .select('id, status')
      .eq('source_course_id', share.course_id)
      .eq('student_id', authResult.user.id)
      .single();

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 409 });
      }
      // Re-activate a dropped enrollment
      if (existing.status === 'dropped') {
        const { data: reactivated, error: reactivateError } = await tq
          .from('cross_tenant_enrollments')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (reactivateError) {
          return NextResponse.json({ error: 'Failed to re-enroll' }, { status: 500 });
        }

        return NextResponse.json({ enrollment: reactivated, reactivated: true });
      }
    }

    // Create enrollment in the student's tenant
    const { data: enrollment, error: enrollError } = await tq
      .from('cross_tenant_enrollments')
      .insert({
        course_share_id: share.id,
        source_course_id: share.course_id,
        source_tenant_id: share.source_tenant_id,
        student_id: authResult.user.id,
        status: 'active',
        progress_percentage: 0,
      })
      .select()
      .single();

    if (enrollError) {
      console.error('Error creating enrollment:', enrollError);
      return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
    }

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error('Error in shared course enroll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  }); // end withIdempotency
}

/**
 * DELETE /api/shared-courses/[id]/enroll
 * Drop enrollment from a shared course
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id: shareId } = await params;

    const { data: share } = await tq.raw
      .from('course_shares')
      .select('id, course_id')
      .eq('id', shareId)
      .single();

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const { error } = await tq
      .from('cross_tenant_enrollments')
      .update({ status: 'dropped', updated_at: new Date().toISOString() })
      .eq('source_course_id', share.course_id)
      .eq('student_id', authResult.user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to drop enrollment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Enrollment dropped' });
  } catch (error) {
    console.error('Error in shared course unenroll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
