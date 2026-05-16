import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const log = createLogger('api/courses/[id]/participants/[participantId]', request);
  const startTime = Date.now();
  const { id, participantId: participantIdParam } = await params;
  const courseId = id;
  const participantId = participantIdParam;

  // Validate parameters
  if (!courseId || typeof courseId !== 'string') {
    return NextResponse.json({ error: 'Invalid course ID format' }, { status: 400 });
  }

  if (!participantId || typeof participantId !== 'string') {
    return NextResponse.json({ error: 'Invalid participant ID format' }, { status: 400 });
  }

  try {
    // Authenticate user with timeout
    const authPromise = authenticateUser(request);
    const authTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Authentication timeout')), 5000)
    );

    const authResult = await Promise.race([authPromise, authTimeout]) as any;

    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, userProfile } = authResult;

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user has access to this course (admin or course instructor)
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role);

    if (!isAdmin) {
      try {
        const { data: courseInstructor, error: instructorError } = await supabase
          .from('course_instructors')
          .select('id')
          .eq('course_id', courseId)
          .eq('instructor_id', user.id)
          .single();

        if (instructorError) {
          log.error('Course instructor check failed', { courseId, userId: user.id }, instructorError);
          return NextResponse.json({ error: 'Failed to verify course access' }, { status: 500 });
        }

        if (!courseInstructor) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } catch (error) {
        log.error('Course instructor check crashed', { courseId, userId: user.id }, error);
        return NextResponse.json({ error: 'Failed to verify course access' }, { status: 500 });
      }
    }

    // Verify the enrollment exists and belongs to this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status')
      .eq('id', participantId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      if (enrollmentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      }
      log.error('Enrollment lookup failed', { participantId, courseId, code: enrollmentError.code }, enrollmentError);
      return NextResponse.json({
        error: 'Failed to verify enrollment',
        details: process.env.NODE_ENV === 'development' ? enrollmentError.message : undefined
      }, { status: 500 });
    }

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Delete the enrollment
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', participantId);

    if (deleteError) {
      log.error('Participant delete failed', { participantId, courseId, code: deleteError.code }, deleteError);
      return NextResponse.json({
        error: 'Failed to drop participant',
        details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    log.info('Participant dropped', { participantId, courseId, durationMs: responseTime });

    return NextResponse.json({
      message: 'Participant dropped successfully',
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    log.error('DELETE handler crashed', { courseId, participantId, durationMs: responseTime }, error);
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ?
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const log = createLogger('api/courses/[id]/participants/[participantId]', request);
  const startTime = Date.now();
  const { id, participantId: participantIdParam } = await params;
  const courseId = id;
  const participantId = participantIdParam;

  // Validate parameters
  if (!courseId || typeof courseId !== 'string') {
    return NextResponse.json({ error: 'Invalid course ID format' }, { status: 400 });
  }

  if (!participantId || typeof participantId !== 'string') {
    return NextResponse.json({ error: 'Invalid participant ID format' }, { status: 400 });
  }

  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { status, progress_percentage } = requestBody;

    // Validate status if provided
    if (status !== undefined && !['active', 'inactive', 'completed', 'dropped'].includes(status)) {
      return NextResponse.json({
        error: 'Invalid status. Must be one of: active, inactive, completed, dropped'
      }, { status: 400 });
    }

    // Validate progress_percentage if provided
    if (progress_percentage !== undefined) {
      if (typeof progress_percentage !== 'number' || progress_percentage < 0 || progress_percentage > 100) {
        return NextResponse.json({
          error: 'Progress percentage must be a number between 0 and 100'
        }, { status: 400 });
      }
    }

    // Authenticate user with timeout
    const authPromise = authenticateUser(request);
    const authTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Authentication timeout')), 5000)
    );

    const authResult = await Promise.race([authPromise, authTimeout]) as any;

    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, userProfile } = authResult;

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user has access to this course (admin or course instructor)
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role);

    if (!isAdmin) {
      try {
        const { data: courseInstructor, error: instructorError } = await supabase
          .from('course_instructors')
          .select('id')
          .eq('course_id', courseId)
          .eq('instructor_id', user.id)
          .single();

        if (instructorError) {
          log.error('Course instructor check failed', { courseId, userId: user.id }, instructorError);
          return NextResponse.json({ error: 'Failed to verify course access' }, { status: 500 });
        }

        if (!courseInstructor) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } catch (error) {
        log.error('Course instructor check crashed', { courseId, userId: user.id }, error);
        return NextResponse.json({ error: 'Failed to verify course access' }, { status: 500 });
      }
    }

    // Verify the enrollment exists and belongs to this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status, progress_percentage')
      .eq('id', participantId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      if (enrollmentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      }
      log.error('Enrollment lookup failed', { participantId, courseId, code: enrollmentError.code }, enrollmentError);
      return NextResponse.json({
        error: 'Failed to verify enrollment',
        details: process.env.NODE_ENV === 'development' ? enrollmentError.message : undefined
      }, { status: 500 });
    }

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Update the enrollment
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (progress_percentage !== undefined) updateData.progress_percentage = progress_percentage;

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Check if there are any updates to make
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No updates provided' });
    }

    const { error: updateError } = await supabase
      .from('enrollments')
      .update(updateData)
      .eq('id', participantId);

    // Trigger certificate generation if course is completed
    if (status === 'completed' && !updateError) {
      // Generate certificate in background (don't wait for it)
      (async () => {
        try {
          const generateUrl = new URL('/api/certificates/generate', request.url);
          await fetch(generateUrl.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': request.headers.get('authorization') || ''
            },
            body: JSON.stringify({
              studentId: enrollment.student_id,
              courseId: courseId
            })
          });
          log.info('Certificate generation triggered', { studentId: enrollment.student_id, courseId });
        } catch (certError) {
          log.error('Certificate generation trigger failed', { studentId: enrollment.student_id, courseId }, certError);
          // Don't fail the enrollment update if certificate generation fails
        }
      })();
    }

    if (updateError) {
      log.error('Participant update failed', { participantId, courseId, code: updateError.code }, updateError);
      return NextResponse.json({
        error: 'Failed to update participant',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    log.info('Participant updated', { participantId, courseId, durationMs: responseTime });

    return NextResponse.json({
      message: 'Participant updated successfully',
      updates: updateData,
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    log.error('PUT handler crashed', { courseId, participantId, durationMs: responseTime }, error);
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ?
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}
