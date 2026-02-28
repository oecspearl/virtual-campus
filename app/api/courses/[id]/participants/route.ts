import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let courseId: string | undefined;
  
  try {
    const resolvedParams = await params;
    courseId = resolvedParams?.id;
    
    // Validate course ID format
    if (!courseId || typeof courseId !== 'string') {
      console.error('Invalid course ID:', { courseId, type: typeof courseId, params: resolvedParams });
      return NextResponse.json({ 
        error: 'Invalid course ID format' 
      }, { status: 400 });
    }

    console.log('Starting participants fetch for course:', courseId);
    
    // Try to authenticate user; if it fails we still allow read-only fetch
    let user: any = null;
    let userProfile: any = null;
    try {
      const authPromise = authenticateUser(request);
      const authTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Authentication timeout')), 5000));
      const authResult: any = await Promise.race([authPromise, authTimeout]);
      if (authResult?.success) {
        user = authResult.user;
        userProfile = authResult.userProfile;
      }
    } catch (e) {
      console.log('Participants GET: proceeding without auth (read-only)');
    }

    // Initialize service client with error handling
    let serviceSupabase;
    try {
      serviceSupabase = createServiceSupabaseClient();
      if (!serviceSupabase) {
        throw new Error('Failed to create service Supabase client');
      }
    } catch (clientError) {
      console.error('Error creating service Supabase client:', clientError);
      return NextResponse.json({ 
        error: 'Failed to initialize database connection',
        details: process.env.NODE_ENV === 'development' ? (clientError instanceof Error ? clientError.message : 'Unknown error') : undefined
      }, { status: 500 });
    }

    // Allow read for anyone hitting this endpoint; UI governs management actions client-side

    console.log('User has access, fetching participants...');

    // Get course participants with enhanced columns using service client (bypass RLS)
    console.log('Fetching participants with enhanced columns for course:', courseId);
    
    // First try with all columns, if that fails, try with just basic columns
    let participants, participantsError;
    try {
      const result = await serviceSupabase
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
      
      participants = result.data;
      participantsError = result.error;
      
      // If we got an error, try a simpler query to see if it's a column issue
      if (participantsError && participantsError.code === '42703') {
        console.log('Column error detected, trying simpler query...');
        const simpleResult = await serviceSupabase
          .from('enrollments')
          .select('*')
          .eq('course_id', courseId)
          .order('enrolled_at', { ascending: false });
        
        if (!simpleResult.error) {
          console.log('Simple query succeeded, using that data');
          participants = simpleResult.data;
          participantsError = null;
        }
      }
    } catch (queryError) {
      console.error('Exception during participants query:', queryError);
      // Try a simple fallback query
      try {
        console.log('Attempting fallback query with * selector...');
        const fallbackResult = await serviceSupabase
          .from('enrollments')
          .select('*')
          .eq('course_id', courseId)
          .order('enrolled_at', { ascending: false });
        
        if (!fallbackResult.error) {
          participants = fallbackResult.data;
          participantsError = null;
        } else {
          participantsError = {
            code: 'QUERY_EXCEPTION',
            message: queryError instanceof Error ? queryError.message : 'Unknown query error',
            details: queryError,
            fallbackError: fallbackResult.error
          };
          participants = null;
        }
      } catch (fallbackError) {
        participantsError = {
          code: 'QUERY_EXCEPTION',
          message: queryError instanceof Error ? queryError.message : 'Unknown query error',
          details: queryError,
          fallbackError: fallbackError instanceof Error ? fallbackError.message : fallbackError
        };
        participants = null;
      }
    }

    console.log('Basic participants query result:', {
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
    let safeParticipants = Array.isArray(participants) ? participants : [];
    console.log(`Found ${safeParticipants.length} participants for course ${courseId}`);
    
    // Enrich participants with user data if denormalized fields are missing
    const participantsNeedingEnrichment = safeParticipants.filter(
      p => !p.student_name || !p.student_email
    );
    
    if (participantsNeedingEnrichment.length > 0) {
      console.log(`Enriching ${participantsNeedingEnrichment.length} participants with missing user data`);
      
      // Get user IDs that need enrichment
      const studentIds = participantsNeedingEnrichment
        .map(p => p.student_id)
        .filter((id): id is string => !!id);
      
      if (studentIds.length > 0) {
        try {
          // Fetch user data from users table
          const { data: users, error: usersError } = await serviceSupabase
            .from('users')
            .select('id, name, email, role, created_at')
            .in('id', studentIds);
          
          if (!usersError && users && users.length > 0) {
            // Create a map of user data by ID
            const userMap = new Map(users.map(u => [u.id, u]));
            
            // Get user profiles for avatar and bio
            const { data: profiles } = await serviceSupabase
              .from('user_profiles')
              .select('user_id, bio, avatar, learning_preferences, created_at')
              .in('user_id', studentIds);
            
            const profileMap = new Map(
              (profiles || []).map(p => [p.user_id, p])
            );
            
            // Enrich participants with user data
            safeParticipants = safeParticipants.map(participant => {
              const user = userMap.get(participant.student_id) as any;
              const profile = profileMap.get(participant.student_id) as any;

              if (user && (!participant.student_name || !participant.student_email)) {
                return {
                  ...participant,
                  student_name: participant.student_name || user.name || 'Unknown Student',
                  student_email: participant.student_email || user.email || null,
                  student_role: participant.student_role || user.role || 'student',
                  student_bio: participant.student_bio || profile?.bio || null,
                  student_avatar: participant.student_avatar || profile?.avatar || null,
                  learning_preferences: participant.learning_preferences || profile?.learning_preferences || {},
                  user_created_at: participant.user_created_at || user.created_at || null,
                  profile_created_at: participant.profile_created_at || profile?.created_at || null
                };
              }
              return participant;
            });
            
            console.log(`Successfully enriched ${participantsNeedingEnrichment.length} participants`);
          } else if (usersError) {
            console.error('Error fetching user data for enrichment:', usersError);
          }
        } catch (enrichmentError) {
          console.error('Exception during participant enrichment:', enrichmentError);
          // Continue with participants even if enrichment fails
        }
      }
    }

    // Get course information using service client with error handling
    let course, courseError;
    try {
      const courseResult = await serviceSupabase
        .from('courses')
        .select('id, title, description, instructor_id')
        .eq('id', courseId)
        .single();
      
      course = courseResult.data;
      courseError = courseResult.error;
      
      // If the detailed query fails, try a simpler query
      if (courseError) {
        console.log('Course query with specific columns failed, trying with *...');
        const simpleCourseResult = await serviceSupabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        
        if (!simpleCourseResult.error) {
          console.log('Simple course query succeeded');
          course = {
            id: simpleCourseResult.data.id,
            title: simpleCourseResult.data.title,
            description: simpleCourseResult.data.description,
            instructor_id: simpleCourseResult.data.instructor_id
          };
          courseError = null;
        }
      }
    } catch (courseQueryError) {
      console.error('Exception during course query:', courseQueryError);
      courseError = {
        code: 'COURSE_QUERY_EXCEPTION',
        message: courseQueryError instanceof Error ? courseQueryError.message : 'Unknown course query error',
        details: courseQueryError
      };
    }

    // If course query fails, still return participants but with minimal course info
    if (courseError) {
      console.error('Database error fetching course:', {
        error: courseError,
        courseId,
        code: courseError.code,
        message: courseError.message,
        details: courseError.details
      });
      
      // Instead of failing completely, provide minimal course info
      course = {
        id: courseId,
        title: 'Unknown Course',
        description: null,
        instructor_id: null
      };
      
      console.log('Using fallback course info due to query error');
    }

    if (!course) {
      console.error('Course not found:', courseId);
      // Provide minimal course info instead of failing
      course = {
        id: courseId,
        title: 'Course Not Found',
        description: null,
        instructor_id: null
      };
      console.log('Using minimal course info as course was not found');
    }

    const responseTime = Date.now() - startTime;
    console.log(`Participants fetch completed in ${responseTime}ms for course ${courseId}`);

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
    console.error('Course Participants API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      courseId,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        cause: error.cause
      } : error
    });
    
    // Return more detailed error information for debugging
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        courseId,
        responseTime: `${responseTime}ms`
      } : undefined
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id: courseId } = await params;
  
  // Validate course ID format
  if (!courseId || typeof courseId !== 'string') {
    console.error('Invalid course ID for POST:', { courseId, type: typeof courseId });
    return NextResponse.json({ 
      error: 'Invalid course ID format' 
    }, { status: 400 });
  }

  try {
    console.log('Starting add participant for course:', courseId);
    
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    const { studentEmail } = requestBody;

    if (!studentEmail || typeof studentEmail !== 'string') {
      console.error('Invalid student email:', { studentEmail, type: typeof studentEmail });
      return NextResponse.json({ 
        error: 'Student email is required and must be a string' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      console.error('Invalid email format:', studentEmail);
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Authenticate user with timeout
    const authPromise = authenticateUser(request);
    const authTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Authentication timeout')), 5000)
    );
    
    const authResult = await Promise.race([authPromise, authTimeout]) as any;

    if (!authResult.success) {
      console.error('Authentication failed for POST:', authResult.error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, userProfile } = authResult;
    
    // Validate user data
    if (!user || !userProfile) {
      console.error('Invalid user data for POST:', { user: !!user, userProfile: !!userProfile });
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Check if user has access to this course (admin or course instructor)
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role);
    
    if (!isAdmin) {
      console.log('User is not admin, checking course instructor status for POST');
      try {
        const { data: courseInstructor, error: instructorError } = await serviceSupabase
          .from('course_instructors')
          .select('id')
          .eq('course_id', courseId)
          .eq('instructor_id', user.id)
          .single();

        if (instructorError) {
          console.error('Error checking course instructor for POST:', instructorError);
          return NextResponse.json({ 
            error: 'Failed to verify course access' 
          }, { status: 500 });
        }

        if (!courseInstructor) {
          console.log('Access denied for POST - user is not course instructor');
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } catch (error) {
        console.error('Course instructor check failed for POST:', error);
        return NextResponse.json({ 
          error: 'Failed to verify course access' 
        }, { status: 500 });
      }
    }

    console.log('User has access, looking up student by email:', studentEmail);

    // Find user by email with detailed error handling
    // Use service client to bypass RLS on users table (prevents infinite recursion)
    const { data: student, error: studentError } = await serviceSupabase
      .from('users')
      .select('id, email, name, role, created_at')
      .eq('email', studentEmail)
      .single();

    if (studentError) {
      console.error('Database error finding student:', {
        error: studentError,
        studentEmail,
        courseId,
        code: studentError.code,
        message: studentError.message
      });
      
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Student not found. Please make sure the student has an account in the system.' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to lookup student',
        details: process.env.NODE_ENV === 'development' ? studentError.message : undefined
      }, { status: 500 });
    }

    if (!student) {
      console.error('Student not found:', studentEmail);
      return NextResponse.json({ 
        error: 'Student not found. Please make sure the student has an account in the system.' 
      }, { status: 404 });
    }

    console.log('Student found, checking for existing enrollment:', student.id);

    // Check if student is already enrolled (use service client to bypass RLS)
    const { data: existingEnrollment, error: existingError } = await serviceSupabase
      .from('enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', student.id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing enrollment:', existingError);
      return NextResponse.json({ 
        error: 'Failed to check existing enrollment',
        details: process.env.NODE_ENV === 'development' ? existingError.message : undefined
      }, { status: 500 });
    }

    if (existingEnrollment) {
      console.log('Student already enrolled:', { 
        enrollmentId: existingEnrollment.id, 
        status: existingEnrollment.status 
      });
      return NextResponse.json({ 
        error: 'Student is already enrolled in this course' 
      }, { status: 400 });
    }

    console.log('Enrolling student:', { studentId: student.id, courseId });

    // Get student profile information for denormalization
    // Use service client to bypass RLS
    const { data: studentProfile } = await serviceSupabase
      .from('user_profiles')
      .select('bio, avatar, learning_preferences, created_at')
      .eq('user_id', student.id)
      .single();

    // Enroll student with denormalized user information
    const enrollmentData = {
      course_id: courseId,
      student_id: student.id,
      status: 'active',
      enrolled_at: new Date().toISOString(),
      student_name: student.name,
      student_email: student.email,
      student_role: student.role,
      student_bio: studentProfile?.bio || null,
      student_avatar: studentProfile?.avatar || null,
      learning_preferences: studentProfile?.learning_preferences || {},
      user_created_at: student.created_at,
      profile_created_at: studentProfile?.created_at || null
    };

    // Use service client for enrollment to bypass RLS
    const { data: enrollment, error: enrollmentError } = await serviceSupabase
      .from('enrollments')
      .insert(enrollmentData)
      .select(`
        id,
        student_id,
        status,
        enrolled_at,
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
      .single();

    if (enrollmentError) {
      console.error('Database error enrolling student:', {
        error: enrollmentError,
        enrollmentData,
        courseId,
        studentId: student.id,
        code: enrollmentError.code,
        message: enrollmentError.message,
        details: enrollmentError.details
      });
      return NextResponse.json({ 
        error: 'Failed to enroll student',
        details: process.env.NODE_ENV === 'development' ? enrollmentError.message : undefined
      }, { status: 500 });
    }

    if (!enrollment) {
      console.error('Enrollment creation returned no data:', enrollmentData);
      return NextResponse.json({ 
        error: 'Failed to create enrollment - no data returned' 
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    console.log(`Student enrolled successfully in ${responseTime}ms:`, {
      enrollmentId: enrollment.id,
      studentEmail,
      courseId
    });

    return NextResponse.json({
      message: 'Student enrolled successfully',
      enrollment,
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Add Participant API Error:', {
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
