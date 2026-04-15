import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { cleanupStudentCourseData } from '@/lib/enrollment-cleanup';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/programmes/[id]/enrollments
 * Get all enrollments for a programme (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: enrollments, error } = await tq
      .from('programme_enrollments')
      .select(`
        *,
        student:student_id(id, name, email)
      `)
      .eq('programme_id', programmeId)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrollments:', error);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    return NextResponse.json({ enrollments: enrollments || [] });
  } catch (error) {
    console.error('Programme enrollments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/programmes/[id]/enrollments
 * Enroll one or more students in a programme (admin only)
 * Body: { student_ids: string[] }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { student_ids } = body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: 'student_ids must be a non-empty array' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify programme exists
    const { data: programme } = await tq
      .from('programmes')
      .select('id, title')
      .eq('id', programmeId)
      .single();

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Verify all students exist
    const { data: students } = await tq
      .from('users')
      .select('id, name, email')
      .in('id', student_ids);

    if (!students || students.length !== student_ids.length) {
      return NextResponse.json({ error: 'One or more students not found' }, { status: 400 });
    }

    // Check for existing enrollments
    const { data: existingEnrollments } = await tq
      .from('programme_enrollments')
      .select('student_id, status')
      .eq('programme_id', programmeId)
      .in('student_id', student_ids);

    const existingMap = new Map(existingEnrollments?.map(e => [e.student_id, e.status]) || []);

    const toInsert: string[] = [];
    const toReactivate: string[] = [];

    for (const studentId of student_ids) {
      const existingStatus = existingMap.get(studentId);
      if (!existingStatus) {
        toInsert.push(studentId);
      } else if (existingStatus === 'withdrawn') {
        toReactivate.push(studentId);
      }
      // Skip already active enrollments
    }

    // Insert new enrollments
    if (toInsert.length > 0) {
      const newEnrollments = toInsert.map(studentId => ({
        programme_id: programmeId,
        student_id: studentId,
        status: 'active',
        enrolled_at: new Date().toISOString()
      }));

      const { error: insertError } = await tq
        .from('programme_enrollments')
        .insert(newEnrollments);

      if (insertError) {
        console.error('Error creating enrollments:', insertError);
        return NextResponse.json({ error: 'Failed to enroll students' }, { status: 500 });
      }
    }

    // Reactivate withdrawn enrollments
    if (toReactivate.length > 0) {
      const { error: updateError } = await tq
        .from('programme_enrollments')
        .update({
          status: 'active',
          enrolled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('programme_id', programmeId)
        .in('student_id', toReactivate);

      if (updateError) {
        console.error('Error reactivating enrollments:', updateError);
      }
    }

    // Fetch all created/updated enrollments
    const { data: createdEnrollments, error } = await tq
      .from('programme_enrollments')
      .select(`
        *,
        student:student_id(id, name, email)
      `)
      .eq('programme_id', programmeId)
      .in('student_id', student_ids);

    if (error) {
      console.error('Error fetching enrollments:', error);
    }

    // The database trigger will auto-enroll students in programme courses
    const enrolledCount = toInsert.length + toReactivate.length;

    return NextResponse.json({
      message: `Successfully enrolled ${enrolledCount} student(s)`,
      enrollments: createdEnrollments || []
    }, { status: 201 });
  } catch (error) {
    console.error('Programme enrollments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/programmes/[id]/enrollments
 * Remove a student from a programme (admin only)
 * Query: ?student_id=xxx
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
    }

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get programme courses before removing student
    const { data: programmeCourses } = await tq
      .from('programme_courses')
      .select('course_id')
      .eq('programme_id', programmeId);

    const courseIds = programmeCourses?.map(pc => pc.course_id) || [];

    // Update status to withdrawn instead of deleting
    const { error } = await tq
      .from('programme_enrollments')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('programme_id', programmeId)
      .eq('student_id', studentId);

    if (error) {
      console.error('Error removing enrollment:', error);
      return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
    }

    // Also mark course enrollments as dropped and clean up data
    const cleanupResults = [];
    for (const courseId of courseIds) {
      // Update course enrollment status
      await tq
        .from('enrollments')
        .update({ status: 'dropped', updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('student_id', studentId);

      // Clean up todos, calendar events, notes, bookmarks
      const cleanup = await cleanupStudentCourseData(tq.raw, studentId, courseId);
      cleanupResults.push({ courseId, ...cleanup });
    }

    return NextResponse.json({
      success: true,
      message: 'Student removed from programme',
      cleanup: cleanupResults
    });
  } catch (error) {
    console.error('Programme enrollments DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/programmes/[id]/enrollments
 * Update enrollment status (admin only)
 * Body: { student_id: string, status: 'active' | 'completed' | 'withdrawn' }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, status } = body;

    if (!student_id || !status) {
      return NextResponse.json({ error: 'student_id and status are required' }, { status: 400 });
    }

    if (!['active', 'completed', 'withdrawn'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: enrollment, error } = await tq
      .from('programme_enrollments')
      .update(updateData)
      .eq('programme_id', programmeId)
      .eq('student_id', student_id)
      .select(`
        *,
        student:student_id(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating enrollment:', error);
      return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 });
    }

    // If status changed to withdrawn, clean up course data
    let cleanupResults = null;
    if (status === 'withdrawn') {
      // Get programme courses
      const { data: programmeCourses } = await tq
        .from('programme_courses')
        .select('course_id')
        .eq('programme_id', programmeId);

      const courseIds = programmeCourses?.map(pc => pc.course_id) || [];

      cleanupResults = [];
      for (const courseId of courseIds) {
        // Update course enrollment status
        await tq
          .from('enrollments')
          .update({ status: 'dropped', updated_at: new Date().toISOString() })
          .eq('course_id', courseId)
          .eq('student_id', student_id);

        // Clean up todos, calendar events, notes, bookmarks
        const cleanup = await cleanupStudentCourseData(tq.raw, student_id, courseId);
        cleanupResults.push({ courseId, ...cleanup });
      }
    }

    return NextResponse.json({ enrollment, cleanup: cleanupResults });
  } catch (error) {
    console.error('Programme enrollments PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
