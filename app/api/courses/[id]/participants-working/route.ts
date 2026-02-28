import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  const courseId = id;
  
  console.log('=== WORKING PARTICIPANTS API ===');
  console.log('Course ID:', courseId);

  // Validate course ID format
  if (!courseId || typeof courseId !== 'string') {
    console.error('Invalid course ID:', { courseId, type: typeof courseId });
    return NextResponse.json({ 
      error: 'Invalid course ID format' 
    }, { status: 400 });
  }

  try {
    console.log('Starting working participants fetch for course:', courseId);
    
    // Authenticate user
    const authResult = await authenticateUser(request);
    
    if (!authResult.success) {
      console.error('Authentication failed:', authResult.error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, userProfile } = authResult;
    
    // Validate user data
    if (!user || !userProfile) {
      console.error('Invalid user data:', { user: !!user, userProfile: !!userProfile });
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }

    console.log('User authenticated:', { userId: user.id, role: userProfile.role });

    const supabase = await createServerSupabaseClient();

    // Check if user has access to this course (admin or course instructor)
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role);
    
    if (!isAdmin) {
      console.log('User is not admin, checking course instructor status');
      try {
        const { data: courseInstructor, error: instructorError } = await supabase
          .from('course_instructors')
          .select('id')
          .eq('course_id', courseId)
          .eq('instructor_id', user.id)
          .single();

        if (instructorError) {
          console.error('Error checking course instructor:', instructorError);
          return NextResponse.json({ 
            error: 'Failed to verify course access' 
          }, { status: 500 });
        }

        if (!courseInstructor) {
          console.log('Access denied - user is not course instructor');
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } catch (error) {
        console.error('Course instructor check failed:', error);
        return NextResponse.json({ 
          error: 'Failed to verify course access' 
        }, { status: 500 });
      }
    }

    console.log('User has access, fetching participants...');

    // Get course participants with enhanced columns
    const { data: participants, error: participantsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        status,
        enrolled_at,
        course_id,
        progress_percentage,
        completed_at,
        student_name,
        student_email,
        student_role,
        student_bio,
        student_avatar,
        learning_preferences,
        user_created_at,
        profile_created_at,
        updated_at
      `)
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    console.log('Participants query result:', {
      count: participants?.length || 0,
      error: participantsError,
      errorCode: participantsError?.code,
      errorMessage: participantsError?.message
    });

    if (participantsError) {
      console.error('Database error fetching participants:', {
        error: participantsError,
        courseId,
        code: participantsError.code,
        message: participantsError.message,
        details: participantsError.details
      });
      return NextResponse.json({ 
        error: 'Failed to fetch participants',
        details: process.env.NODE_ENV === 'development' ? participantsError.message : undefined
      }, { status: 500 });
    }

    // Validate participants data
    const safeParticipants = Array.isArray(participants) ? participants : [];
    console.log(`Found ${safeParticipants.length} participants for course ${courseId}`);

    // Get course information
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, description')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Database error fetching course:', {
        error: courseError,
        courseId,
        code: courseError.code,
        message: courseError.message
      });
      return NextResponse.json({ 
        error: 'Failed to fetch course information',
        details: process.env.NODE_ENV === 'development' ? courseError.message : undefined
      }, { status: 500 });
    }

    if (!course) {
      console.error('Course not found:', courseId);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const responseTime = Date.now() - startTime;
    console.log(`Working participants fetch completed in ${responseTime}ms for course ${courseId}`);

    return NextResponse.json({
      course,
      participants: safeParticipants,
      meta: {
        count: safeParticipants.length,
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Working Participants API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      courseId,
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
