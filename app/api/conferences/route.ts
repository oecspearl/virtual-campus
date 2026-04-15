import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';
import { v4 as uuidv4 } from 'uuid';
import { createGoogleMeetLink, isGoogleCalendarConfigured } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const status = searchParams.get('status');

    // Try to fetch with joins, but handle errors gracefully
    let query = tq
      .from('video_conferences')
      .select(`
        *,
        instructor:users!instructor_id(
          id,
          email,
          name
        ),
        course:courses!course_id(
          id,
          title,
          description
        ),
        lesson:lessons!lesson_id(
          id,
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: conferences, error } = await query;

    if (error) {
      console.error('Error fetching conferences:', error);
      // If foreign key joins fail, try fetching without joins
      console.log('Attempting to fetch conferences without joins...');
      const simpleQuery = tq
        .from('video_conferences')
        .select('*')
        .order('created_at', { ascending: false });

      if (courseId) {
        simpleQuery.eq('course_id', courseId);
      }
      if (status) {
        simpleQuery.eq('status', status);
      }

      const { data: simpleData, error: simpleError } = await simpleQuery;

      if (simpleError) {
        console.error('Error fetching conferences (simple query):', simpleError);
        return NextResponse.json({
          error: 'Failed to fetch conferences',
          details: simpleError.message
        }, { status: 500 });
      }

      return NextResponse.json({ conferences: simpleData || [] });
    }

    return NextResponse.json({ conferences: conferences || [] });
  } catch (error) {
    console.error('Error in conferences GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const {
      title,
      description,
      course_id,
      lesson_id,
      scheduled_at,
      timezone = 'America/New_York',
      duration_minutes = 60,
      max_participants = 100,
      recording_enabled = false,
      waiting_room_enabled = false, // Force disable waiting room to prevent members-only error
      video_provider = '8x8vc',
      google_meet_link: providedGoogleMeetLink
    } = body;

    // Validate required fields
    if (!title || !course_id) {
      return NextResponse.json({ error: 'Title and course_id are required' }, { status: 400 });
    }

    // Get user data to check role (use raw client to avoid tenant mismatch)
    const { data: userData, error: userError } = await tq.raw
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User lookup failed:', userError?.message, 'user.id:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to create conferences
    // Allow if user is instructor of the course OR has admin privileges
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userData.role);

    if (!isAdmin) {
      // Only check course instructor relationship if not admin
      const { data: courseInstructor, error: courseError } = await tq
        .from('course_instructors')
        .select('id')
        .eq('course_id', course_id)
        .eq('instructor_id', user.id)
        .single();

      if (courseError || !courseInstructor) {
        console.error('Course instructor check failed:', courseError);
        return NextResponse.json({
          error: 'Course not found or access denied',
          details: courseError?.message
        }, { status: 403 });
      }
    }

    // Generate unique meeting ID and URL based on provider
    let meetingId = `oecs-${uuidv4().replace(/-/g, '')}`;

    let meetingUrl: string;
    let googleMeetLink: string | undefined;
    const vpaasTenant = 'vpaas-magic-cookie-544a27fe05c5424b83f556032127b237';

    // Validate meeting_id uniqueness (retry up to 3 times if collision)
    let attempts = 0;
    while (attempts < 3) {
      const { data: existingConference } = await tq
        .from('video_conferences')
        .select('id')
        .eq('meeting_id', meetingId)
        .single();

      if (!existingConference) {
        break; // meeting_id is unique
      }

      // Generate new meeting_id if collision
      meetingId = `oecs-${uuidv4().replace(/-/g, '')}`;
      attempts++;
    }

    if (video_provider === 'google_meet') {
      // For Google Meet, use provided link or auto-generate via Calendar API
      if (providedGoogleMeetLink && providedGoogleMeetLink.startsWith('https://meet.google.com/')) {
        googleMeetLink = providedGoogleMeetLink;
      } else if (isGoogleCalendarConfigured()) {
        // Auto-generate via Google Calendar API (works for both scheduled and instant meetings)
        const startTime = scheduled_at ? new Date(scheduled_at) : new Date();
        const endTime = new Date(startTime.getTime() + (duration_minutes * 60 * 1000));
        const result = await createGoogleMeetLink(
          title,
          description || '',
          startTime,
          endTime,
          timezone
        );

        if ('link' in result) {
          googleMeetLink = result.link;
        } else {
          console.error('[Conference] Google Meet auto-generation failed:', result.error);
          return NextResponse.json({
            error: `Failed to auto-generate Google Meet link: ${result.error}`,
            requiresManualLink: true
          }, { status: 400 });
        }
      } else {
        // Google Calendar API not configured and no manual link provided
        return NextResponse.json({
          error: 'Google Meet link is required. Please provide a Google Meet link or configure Google Calendar API to auto-generate links.',
          requiresManualLink: true,
          hint: 'To auto-generate links, configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables.'
        }, { status: 400 });
      }
      meetingUrl = googleMeetLink; // Use same URL for compatibility
    } else if (video_provider === 'bigbluebutton') {
      // Generate BigBlueButton URL
      // In a real implementation, this would use the BBB API to create a meeting and get a join URL
      // For now, we'll construct a URL that points to a BBB server (mock or real if env vars exist)

      const bbbUrl = process.env.BBB_URL || 'https://test-install.blindsidenetworks.com/bigbluebutton/';
      const bbbSecret = process.env.BBB_SECRET || '8cd8ef52e8e101574e400365b55e11a6'; // Default test secret

      // We would typically use a library like 'bigbluebutton-js' here
      // For this implementation, we'll store the base URL and let the client handle the join (or return a direct join link)
      // Since we need a "meeting_url" for the database, we'll generate a direct join link for the moderator (instructor)

      // Simple checksum generation for BBB (SHA1)
      // checksum = sha1("join" + params + secret)

      // For the purpose of this demo/MVP, we will point to a generic BBB test room or 
      // just store the base meeting ID and let the frontend/backend handle the actual API call to join later.
      // However, the schema requires a meeting_url.

      // Let's use a placeholder URL that the frontend can recognize or a valid test URL
      meetingUrl = `${bbbUrl}api/join?meetingID=${meetingId}&fullName=${encodeURIComponent(user.email || 'Instructor')}&password=mp`;

      // Note: In a production environment, you wouldn't store the join URL with the password in the DB for everyone to see.
      // You would generate unique join URLs for each participant on demand.
      // But for this "VideoConference" table structure which seems to assume a single URL, we'll use this pattern 
      // or rely on the frontend to generate the specific join link based on the meeting_id.

      // Better approach: Store a generic landing page or the API endpoint, and have a separate endpoint to get the actual join URL.
      // For now, to fit the existing schema/pattern:
      meetingUrl = `/api/conferences/${meetingId}/join-bbb`; // We'll need to implement this redirect handler if we want it to be clean

      // actually, let's just stick to a direct link for now to keep it simple for the MVP, 
      // assuming the user will click it and we handle the redirection/signing there.
      // But wait, the frontend opens this URL in a new tab.
      // So let's point to a Next.js route that will handle the signing.
      meetingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/conferences/join-bbb?meetingID=${meetingId}`;

    } else {
      // Generate 8x8.vc VPaaS URL
      meetingUrl = `https://8x8.vc/${vpaasTenant}/${meetingId}`;
    }


    // Create conference using tenant-scoped query
    // We've already validated permissions above
    const { data: conference, error: conferenceError } = await tq
      .from('video_conferences')
      .insert([{
        title,
        description,
        course_id,
        lesson_id: lesson_id || null,
        instructor_id: user.id,
        meeting_id: meetingId,
        meeting_url: meetingUrl,
        video_provider: video_provider,
        google_meet_link: googleMeetLink,
        scheduled_at: scheduled_at || null,
        timezone: timezone || 'America/New_York',
        duration_minutes,
        max_participants,
        recording_enabled,
        waiting_room_enabled: false, // Force disable waiting room to prevent members-only error
        status: scheduled_at ? 'scheduled' : 'live'
      }])
      .select('*')
      .single();

    if (conferenceError) {
      console.error('Error creating conference:', conferenceError);
      console.error('Conference data attempted:', {
        title,
        course_id,
        instructor_id: user.id,
        meeting_id: meetingId,
        video_provider
      });
      return NextResponse.json({
        error: 'Failed to create conference',
        details: conferenceError.message,
        code: conferenceError.code
      }, { status: 500 });
    }

    // Try to fetch related data separately if needed
    let conferenceWithRelations = conference;
    try {
      // Fetch instructor info
      const { data: instructorData } = await tq
        .from('users')
        .select('id, email, name')
        .eq('id', conference.instructor_id)
        .single();

      // Fetch course info
      const { data: courseData } = await tq
        .from('courses')
        .select('id, title, description')
        .eq('id', conference.course_id)
        .single();

      // Fetch lesson info if lesson_id exists
      let lessonData = null;
      if (conference.lesson_id) {
        const { data: lesson } = await tq
          .from('lessons')
          .select('id, title')
          .eq('id', conference.lesson_id)
          .single();
        lessonData = lesson;
      }

      conferenceWithRelations = {
        ...conference,
        instructor: instructorData,
        course: courseData,
        lesson: lessonData
      };
    } catch (relationError) {
      console.warn('Could not fetch related data, returning conference without relations:', relationError);
      // Continue with conference data without relations
    }

    return NextResponse.json({ conference: conferenceWithRelations }, { status: 201 });
  } catch (error) {
    console.error('Error in conferences POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
