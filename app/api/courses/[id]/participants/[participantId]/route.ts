import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser } from '@/lib/api-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const startTime = Date.now();
  const { id, participantId: participantIdParam } = await params;
  const courseId = id;
  const participantId = participantIdParam;
  
  // Validate parameters
  if (!courseId || typeof courseId !== 'string') {
    console.error('Invalid course ID for DELETE:', { courseId, type: typeof courseId });
    return NextResponse.json({ 
      error: 'Invalid course ID format' 
    }, { status: 400 });
  }

  if (!participantId || typeof participantId !== 'string') {
    console.error('Invalid participant ID for DELETE:', { participantId, type: typeof participantId });
    return NextResponse.json({ 
      error: 'Invalid participant ID format' 
    }, { status: 400 });
  }

  try {
    console.log('Starting drop participant:', { courseId, participantId });
    
    // Authenticate user with timeout
    const authPromise = authenticateUser(request);
    const authTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Authentication timeout')), 5000)
    );
    
    const authResult = await Promise.race([authPromise, authTimeout]) as any;

    if (!authResult.success) {
      console.error('Authentication failed for DELETE:', authResult.error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, userProfile } = authResult;
    
    // Validate user data
    if (!user || !userProfile) {
      console.error('Invalid user data for DELETE:', { user: !!user, userProfile: !!userProfile });
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user has access to this course (admin or course instructor)
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role);
    
    if (!isAdmin) {
      console.log('User is not admin, checking course instructor status for DELETE');
      try {
        const { data: courseInstructor, error: instructorError } = await supabase
          .from('course_instructors')
          .select('id')
          .eq('course_id', courseId)
          .eq('instructor_id', user.id)
          .single();

        if (instructorError) {
          console.error('Error checking course instructor for DELETE:', instructorError);
          return NextResponse.json({ 
            error: 'Failed to verify course access' 
          }, { status: 500 });
        }

        if (!courseInstructor) {
          console.log('Access denied for DELETE - user is not course instructor');
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } catch (error) {
        console.error('Course instructor check failed for DELETE:', error);
        return NextResponse.json({ 
          error: 'Failed to verify course access' 
        }, { status: 500 });
      }
    }

    console.log('User has access, verifying enrollment exists:', participantId);

    // Verify the enrollment exists and belongs to this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status')
      .eq('id', participantId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      console.error('Database error finding enrollment:', {
        error: enrollmentError,
        participantId,
        courseId,
        code: enrollmentError.code,
        message: enrollmentError.message
      });
      
      if (enrollmentError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Enrollment not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to verify enrollment',
        details: process.env.NODE_ENV === 'development' ? enrollmentError.message : undefined
      }, { status: 500 });
    }

    if (!enrollment) {
      console.error('Enrollment not found:', { participantId, courseId });
      return NextResponse.json({ 
        error: 'Enrollment not found' 
      }, { status: 404 });
    }

    console.log('Enrollment found, dropping participant:', {
      enrollmentId: enrollment.id,
      studentId: enrollment.student_id,
      status: enrollment.status
    });

    // Delete the enrollment
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', participantId);

    if (deleteError) {
      console.error('Database error dropping participant:', {
        error: deleteError,
        participantId,
        courseId,
        code: deleteError.code,
        message: deleteError.message
      });
      return NextResponse.json({ 
        error: 'Failed to drop participant',
        details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    console.log(`Participant dropped successfully in ${responseTime}ms:`, {
      participantId,
      courseId
    });

    return NextResponse.json({
      message: 'Participant dropped successfully',
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Drop Participant API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      courseId,
      participantId,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
    
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
  const startTime = Date.now();
  const { id, participantId: participantIdParam } = await params;
  const courseId = id;
  const participantId = participantIdParam;
  
  // Validate parameters
  if (!courseId || typeof courseId !== 'string') {
    console.error('Invalid course ID for PUT:', { courseId, type: typeof courseId });
    return NextResponse.json({ 
      error: 'Invalid course ID format' 
    }, { status: 400 });
  }

  if (!participantId || typeof participantId !== 'string') {
    console.error('Invalid participant ID for PUT:', { participantId, type: typeof participantId });
    return NextResponse.json({ 
      error: 'Invalid participant ID format' 
    }, { status: 400 });
  }

  try {
    console.log('Starting update participant:', { courseId, participantId });
    
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('Invalid JSON in request body for PUT:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    const { status, progress_percentage } = requestBody;

    // Validate status if provided
    if (status !== undefined && !['active', 'inactive', 'completed', 'dropped'].includes(status)) {
      console.error('Invalid status value:', status);
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: active, inactive, completed, dropped' 
      }, { status: 400 });
    }

    // Validate progress_percentage if provided
    if (progress_percentage !== undefined) {
      if (typeof progress_percentage !== 'number' || progress_percentage < 0 || progress_percentage > 100) {
        console.error('Invalid progress_percentage:', progress_percentage);
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
      console.error('Authentication failed for PUT:', authResult.error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, userProfile } = authResult;
    
    // Validate user data
    if (!user || !userProfile) {
      console.error('Invalid user data for PUT:', { user: !!user, userProfile: !!userProfile });
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user has access to this course (admin or course instructor)
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role);
    
    if (!isAdmin) {
      console.log('User is not admin, checking course instructor status for PUT');
      try {
        const { data: courseInstructor, error: instructorError } = await supabase
          .from('course_instructors')
          .select('id')
          .eq('course_id', courseId)
          .eq('instructor_id', user.id)
          .single();

        if (instructorError) {
          console.error('Error checking course instructor for PUT:', instructorError);
          return NextResponse.json({ 
            error: 'Failed to verify course access' 
          }, { status: 500 });
        }

        if (!courseInstructor) {
          console.log('Access denied for PUT - user is not course instructor');
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } catch (error) {
        console.error('Course instructor check failed for PUT:', error);
        return NextResponse.json({ 
          error: 'Failed to verify course access' 
        }, { status: 500 });
      }
    }

    console.log('User has access, verifying enrollment exists:', participantId);

    // Verify the enrollment exists and belongs to this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status, progress_percentage')
      .eq('id', participantId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      console.error('Database error finding enrollment for PUT:', {
        error: enrollmentError,
        participantId,
        courseId,
        code: enrollmentError.code,
        message: enrollmentError.message
      });
      
      if (enrollmentError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Enrollment not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to verify enrollment',
        details: process.env.NODE_ENV === 'development' ? enrollmentError.message : undefined
      }, { status: 500 });
    }

    if (!enrollment) {
      console.error('Enrollment not found for PUT:', { participantId, courseId });
      return NextResponse.json({ 
        error: 'Enrollment not found' 
      }, { status: 404 });
    }

    console.log('Enrollment found, updating participant:', {
      enrollmentId: enrollment.id,
      currentStatus: enrollment.status,
      currentProgress: enrollment.progress_percentage,
      newStatus: status,
      newProgress: progress_percentage
    });

    // Update the enrollment
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (progress_percentage !== undefined) updateData.progress_percentage = progress_percentage;
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Check if there are any updates to make
    if (Object.keys(updateData).length === 0) {
      console.log('No updates to make');
      return NextResponse.json({ 
        message: 'No updates provided' 
      });
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
          console.log(`Certificate generation triggered for student ${enrollment.student_id}, course ${courseId}`);
        } catch (certError) {
          console.error('Error triggering certificate generation:', certError);
          // Don't fail the enrollment update if certificate generation fails
        }
      })();
    }

    if (updateError) {
      console.error('Database error updating participant:', {
        error: updateError,
        updateData,
        participantId,
        courseId,
        code: updateError.code,
        message: updateError.message
      });
      return NextResponse.json({ 
        error: 'Failed to update participant',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    console.log(`Participant updated successfully in ${responseTime}ms:`, {
      participantId,
      courseId,
      updates: updateData
    });

    return NextResponse.json({
      message: 'Participant updated successfully',
      updates: updateData,
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Update Participant API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      courseId,
      participantId,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}
