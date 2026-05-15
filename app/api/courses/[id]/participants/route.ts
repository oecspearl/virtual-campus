import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = createLogger('api/courses/[id]/participants', request);
  const startTime = Date.now();
  let courseId: string | undefined;

  try {
    const resolvedParams = await params;
    courseId = resolvedParams?.id;

    // Validate course ID format
    if (!courseId || typeof courseId !== 'string') {
      log.error('Invalid course ID', { courseId, type: typeof courseId });
      return NextResponse.json({
        error: 'Invalid course ID format'
      }, { status: 400 });
    }

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
    } catch {
      // Proceed without auth (read-only)
    }

    // Initialize service client with error handling
    let serviceSupabase;
    try {
      serviceSupabase = createServiceSupabaseClient();
      if (!serviceSupabase) {
        throw new Error('Failed to create service Supabase client');
      }
    } catch (clientError) {
      log.error('Error creating service Supabase client', { courseId }, clientError);
      return NextResponse.json({
        error: 'Failed to initialize database connection',
        details: process.env.NODE_ENV === 'development' ? (clientError instanceof Error ? clientError.message : 'Unknown error') : undefined
      }, { status: 500 });
    }

    // Allow read for anyone hitting this endpoint; UI governs management actions client-side

    // Get course participants with enhanced columns using service client (bypass RLS)
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

      // If we got a column error, retry with a wider selector
      if (participantsError && participantsError.code === '42703') {
        const simpleResult = await serviceSupabase
          .from('enrollments')
          .select('*')
          .eq('course_id', courseId)
          .order('enrolled_at', { ascending: false });

        if (!simpleResult.error) {
          participants = simpleResult.data;
          participantsError = null;
        }
      }
    } catch (queryError) {
      log.error('Exception during participants query', { courseId }, queryError);
      // Try a simple fallback query
      try {
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

    if (participantsError) {
      log.error('Database error fetching participants', {
        courseId,
        code: participantsError.code,
        details: participantsError.details,
      }, participantsError);
      return NextResponse.json({
        error: 'Failed to fetch participants',
        details: process.env.NODE_ENV === 'development' ? participantsError.message : undefined
      }, { status: 500 });
    }

    // Validate participants data
    let safeParticipants = Array.isArray(participants) ? participants : [];

    // Enrich participants with user data if denormalized fields are missing
    const participantsNeedingEnrichment = safeParticipants.filter(
      p => !p.student_name || !p.student_email
    );

    if (participantsNeedingEnrichment.length > 0) {
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
          } else if (usersError) {
            log.error('Error fetching user data for enrichment', { courseId, studentIds }, usersError);
          }
        } catch (enrichmentError) {
          log.error('Exception during participant enrichment', { courseId }, enrichmentError);
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
        const simpleCourseResult = await serviceSupabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (!simpleCourseResult.error) {
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
      log.error('Exception during course query', { courseId }, courseQueryError);
      courseError = {
        code: 'COURSE_QUERY_EXCEPTION',
        message: courseQueryError instanceof Error ? courseQueryError.message : 'Unknown course query error',
        details: courseQueryError
      };
    }

    // If course query fails, still return participants but with minimal course info
    if (courseError) {
      log.error('Database error fetching course', {
        courseId,
        code: courseError.code,
        details: courseError.details,
      }, courseError);

      // Instead of failing completely, provide minimal course info
      course = {
        id: courseId,
        title: 'Unknown Course',
        description: null,
        instructor_id: null
      };
    }

    if (!course) {
      log.warn('Course not found', { courseId });
      // Provide minimal course info instead of failing
      course = {
        id: courseId,
        title: 'Course Not Found',
        description: null,
        instructor_id: null
      };
    }

    const responseTime = Date.now() - startTime;

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
    log.error('GET handler crashed', { courseId, durationMs: responseTime }, error);

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
  const log = createLogger('api/courses/[id]/participants', request);
  const startTime = Date.now();
  const { id: courseId } = await params;

  // Validate course ID format
  if (!courseId || typeof courseId !== 'string') {
    log.error('Invalid course ID for POST', { courseId, type: typeof courseId });
    return NextResponse.json({
      error: 'Invalid course ID format'
    }, { status: 400 });
  }

  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      log.error('Invalid JSON in request body', { courseId }, parseError);
      return NextResponse.json({
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { studentEmail } = requestBody;

    if (!studentEmail || typeof studentEmail !== 'string') {
      log.error('Invalid student email', { courseId, type: typeof studentEmail });
      return NextResponse.json({
        error: 'Student email is required and must be a string'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      log.warn('Invalid email format', { courseId });
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
      log.warn('Authentication failed for POST', { courseId, reason: authResult.error });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, userProfile } = authResult;

    // Validate user data
    if (!user || !userProfile) {
      log.error('Invalid user data for POST', { courseId, hasUser: !!user, hasProfile: !!userProfile });
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Check if user has access to this course (admin or course instructor)
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role);

    if (!isAdmin) {
      try {
        const { data: courseInstructor, error: instructorError } = await serviceSupabase
          .from('course_instructors')
          .select('id')
          .eq('course_id', courseId)
          .eq('instructor_id', user.id)
          .single();

        if (instructorError) {
          log.error('Error checking course instructor for POST', { courseId, userId: user.id }, instructorError);
          return NextResponse.json({
            error: 'Failed to verify course access'
          }, { status: 500 });
        }

        if (!courseInstructor) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } catch (error) {
        log.error('Course instructor check failed for POST', { courseId, userId: user.id }, error);
        return NextResponse.json({
          error: 'Failed to verify course access'
        }, { status: 500 });
      }
    }

    // Find user by email with detailed error handling
    // Use service client to bypass RLS on users table (prevents infinite recursion)
    const { data: student, error: studentError } = await serviceSupabase
      .from('users')
      .select('id, email, name, role, created_at')
      .eq('email', studentEmail)
      .single();

    if (studentError) {
      // PGRST116 is "no rows found" — expected when the email isn't a known user
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({
          error: 'Student not found. Please make sure the student has an account in the system.'
        }, { status: 404 });
      }
      log.error('Database error finding student', { courseId, code: studentError.code }, studentError);
      return NextResponse.json({
        error: 'Failed to lookup student',
        details: process.env.NODE_ENV === 'development' ? studentError.message : undefined
      }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({
        error: 'Student not found. Please make sure the student has an account in the system.'
      }, { status: 404 });
    }

    // Check if student is already enrolled (use service client to bypass RLS)
    const { data: existingEnrollment, error: existingError } = await serviceSupabase
      .from('enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', student.id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      log.error('Error checking existing enrollment', { courseId, studentId: student.id }, existingError);
      return NextResponse.json({
        error: 'Failed to check existing enrollment',
        details: process.env.NODE_ENV === 'development' ? existingError.message : undefined
      }, { status: 500 });
    }

    if (existingEnrollment) {
      return NextResponse.json({
        error: 'Student is already enrolled in this course'
      }, { status: 400 });
    }

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
      log.error('Database error enrolling student', {
        courseId,
        studentId: student.id,
        code: enrollmentError.code,
        details: enrollmentError.details,
      }, enrollmentError);
      return NextResponse.json({
        error: 'Failed to enroll student',
        details: process.env.NODE_ENV === 'development' ? enrollmentError.message : undefined
      }, { status: 500 });
    }

    if (!enrollment) {
      log.error('Enrollment creation returned no data', { courseId, studentId: student.id });
      return NextResponse.json({
        error: 'Failed to create enrollment - no data returned'
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      message: 'Student enrolled successfully',
      enrollment,
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    log.error('POST handler crashed', { courseId, durationMs: responseTime }, error);

    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ?
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}
