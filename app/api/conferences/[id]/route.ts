import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    const { id: conferenceId } = await params;

    const { data: conference, error } = await tq
      .from('video_conferences')
      .select(`
        *,
        instructor:users!video_conferences_instructor_id_fkey(
          id,
          email,
          name
        ),
        course:courses!video_conferences_course_id_fkey(
          id,
          title,
          description
        ),
        lesson:lessons!video_conferences_lesson_id_fkey(
          id,
          title
        ),
        participants:conference_participants(
          id,
          user_id,
          joined_at,
          left_at,
          role,
          user:users!conference_participants_user_id_fkey(
            id,
            email,
            name
          )
        )
      `)
      .eq('id', conferenceId)
      .single();

    if (error) {
      console.error('Error fetching conference:', error);
      return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
    }

    return NextResponse.json({ conference });
  } catch (error) {
    console.error('Error in conference GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    const { id: conferenceId } = await params;

    const body = await request.json();
    const {
      title,
      description,
      scheduled_at,
      duration_minutes,
      max_participants,
      recording_enabled,
      waiting_room_enabled,
      status
    } = body;

    // Verify user is instructor of the conference
    const { data: existingConference, error: fetchError } = await tq
      .from('video_conferences')
      .select('id, instructor_id, course_id')
      .eq('id', conferenceId)
      .eq('instructor_id', user.id)
      .single();

    if (fetchError || !existingConference) {
      return NextResponse.json({ error: 'Conference not found or access denied' }, { status: 403 });
    }

    // Verify user is instructor of the course
    const { data: courseInstructor, error: courseError } = await tq
      .from('course_instructors')
      .select('id')
      .eq('course_id', existingConference.course_id)
      .eq('instructor_id', user.id)
      .single();

    if (courseError || !courseInstructor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update conference using tenant-scoped query
    const { data: conference, error } = await tq
      .from('video_conferences')
      .update({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(scheduled_at !== undefined && { scheduled_at }),
        ...(duration_minutes !== undefined && { duration_minutes }),
        ...(max_participants !== undefined && { max_participants }),
        ...(recording_enabled !== undefined && { recording_enabled }),
        ...(waiting_room_enabled !== undefined && { waiting_room_enabled }),
        ...(status && { status })
      })
      .eq('id', conferenceId)
      .select(`
        *,
        instructor:users!video_conferences_instructor_id_fkey(
          id,
          email,
          name
        ),
        course:courses!video_conferences_course_id_fkey(
          id,
          title,
          description
        ),
        lesson:lessons!video_conferences_lesson_id_fkey(
          id,
          title
        )
      `)
      .single();

    if (error) {
      console.error('Error updating conference:', error);
      return NextResponse.json({ error: 'Failed to update conference' }, { status: 500 });
    }

    return NextResponse.json({ conference });
  } catch (error) {
    console.error('Error in conference PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    const { id: conferenceId } = await params;
    console.log('Delete conference request:', { conferenceId, userId: user.id });

    // Check if user is admin (using same method as other endpoints)
    const { data: userData, error: userError } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.log('User not found:', { userError, userData });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userData.role);
    console.log('User role check:', {
      isAdmin,
      role: userData.role,
      userError,
      userId: user.id,
      userEmail: user.email
    });

    // Get conference details using tenant-scoped query
    const { data: existingConference, error: fetchError } = await tq
      .from('video_conferences')
      .select('id, instructor_id, course_id')
      .eq('id', conferenceId)
      .single();

    if (fetchError || !existingConference) {
      console.log('Conference not found:', { fetchError, existingConference });
      return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
    }

    // Check authorization: either admin OR (instructor of conference AND course instructor)
    const isInstructorOfConference = existingConference.instructor_id === user.id;

    console.log('Authorization check:', {
      isAdmin,
      isInstructorOfConference,
      conferenceInstructorId: existingConference.instructor_id,
      userId: user.id,
      shouldAllow: isAdmin || isInstructorOfConference
    });

    if (!isAdmin && !isInstructorOfConference) {
      console.log('Not authorized: not admin and not conference instructor');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If not admin, verify user is instructor of the course
    if (!isAdmin) {
      const { data: courseInstructor, error: courseError } = await tq
        .from('course_instructors')
        .select('id')
        .eq('course_id', existingConference.course_id)
        .eq('instructor_id', user.id)
        .single();

      if (courseError || !courseInstructor) {
        console.log('Course instructor check failed:', { courseError, courseInstructor, courseId: existingConference.course_id });
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    console.log('Proceeding with conference deletion:', { conferenceId });

    // Delete related records first (no CASCADE set up in database)
    // 1. Delete conference recordings
    const { error: recordingsError } = await tq
      .from('conference_recordings')
      .delete()
      .eq('conference_id', conferenceId);

    if (recordingsError) {
      console.log('Note: Error deleting conference recordings (may not exist):', recordingsError.message);
      // Continue anyway - recordings might not exist
    } else {
      console.log('Deleted conference recordings for:', conferenceId);
    }

    // 2. Delete conference participants
    const { error: participantsError } = await tq
      .from('conference_participants')
      .delete()
      .eq('conference_id', conferenceId);

    if (participantsError) {
      console.log('Note: Error deleting conference participants (may not exist):', participantsError.message);
      // Continue anyway - participants might not exist
    } else {
      console.log('Deleted conference participants for:', conferenceId);
    }

    // 3. Now delete the conference itself
    const { error } = await tq
      .from('video_conferences')
      .delete()
      .eq('id', conferenceId);

    if (error) {
      console.error('Error deleting conference:', error);
      return NextResponse.json({ error: 'Failed to delete conference' }, { status: 500 });
    }

    console.log('Conference deleted successfully:', { conferenceId });

    return NextResponse.json({ message: 'Conference deleted successfully' });
  } catch (error) {
    console.error('Error in conference DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
