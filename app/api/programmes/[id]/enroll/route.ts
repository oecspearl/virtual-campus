import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { cleanupStudentCourseData } from '@/lib/enrollment-cleanup';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/programmes/[id]/enroll
 * Enroll current user in a programme
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if programme exists and is published
    const { data: programme } = await tq
      .from('programmes')
      .select('id, title, published')
      .eq('id', programmeId)
      .single();

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    if (!programme.published) {
      return NextResponse.json({ error: 'Programme is not available for enrollment' }, { status: 400 });
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await tq
      .from('programme_enrollments')
      .select('id, status')
      .eq('programme_id', programmeId)
      .eq('student_id', userProfile.id)
      .single();

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return NextResponse.json({ error: 'Already enrolled in this programme' }, { status: 400 });
      }

      // Re-activate if previously withdrawn
      if (existingEnrollment.status === 'withdrawn') {
        const { data: updatedEnrollment, error } = await tq
          .from('programme_enrollments')
          .update({
            status: 'active',
            enrolled_at: new Date().toISOString(),
            completed_at: null,
            final_score: null
          })
          .eq('id', existingEnrollment.id)
          .select()
          .single();

        if (error) {
          console.error('Error re-enrolling in programme:', error);
          return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
        }

        return NextResponse.json({ enrollment: updatedEnrollment, message: 'Re-enrolled successfully' });
      }
    }

    // Create new enrollment (trigger will auto-enroll in courses)
    const { data: enrollment, error } = await tq
      .from('programme_enrollments')
      .insert({
        programme_id: programmeId,
        student_id: userProfile.id,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error enrolling in programme:', error);
      return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
    }

    return NextResponse.json({ enrollment, message: 'Enrolled successfully' }, { status: 201 });
  } catch (error) {
    console.error('Programme enroll POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/programmes/[id]/enroll
 * Withdraw from a programme
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get programme courses before withdrawing
    const { data: programmeCourses } = await tq
      .from('programme_courses')
      .select('course_id')
      .eq('programme_id', programmeId);

    const courseIds = programmeCourses?.map(pc => pc.course_id) || [];

    // Update enrollment status to withdrawn
    const { data: enrollment, error } = await tq
      .from('programme_enrollments')
      .update({ status: 'withdrawn' })
      .eq('programme_id', programmeId)
      .eq('student_id', userProfile.id)
      .eq('status', 'active')
      .select()
      .single();

    if (error || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Also mark course enrollments as dropped and clean up data
    const cleanupResults = [];
    for (const courseId of courseIds) {
      // Update course enrollment status
      await tq
        .from('enrollments')
        .update({ status: 'dropped', updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('student_id', userProfile.id);

      // Clean up todos, calendar events, notes, bookmarks
      const cleanup = await cleanupStudentCourseData(tq.raw, userProfile.id, courseId);
      cleanupResults.push({ courseId, ...cleanup });
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawn from programme',
      cleanup: cleanupResults
    });
  } catch (error) {
    console.error('Programme enroll DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/programmes/[id]/enroll
 * Get enrollment status for current user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ enrolled: false });
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: enrollment } = await tq
      .from('programme_enrollments')
      .select('*')
      .eq('programme_id', programmeId)
      .eq('student_id', userProfile.id)
      .single();

    return NextResponse.json({
      enrolled: !!enrollment && enrollment.status === 'active',
      enrollment
    });
  } catch (error) {
    console.error('Programme enroll GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
