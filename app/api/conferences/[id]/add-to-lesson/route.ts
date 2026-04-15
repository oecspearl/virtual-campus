import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

/**
 * POST /api/conferences/[id]/add-to-lesson
 * Add a conference recording as a video content item in a lesson
 */
export async function POST(
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
    const { lesson_id, recording_id, title, description } = body;

    if (!lesson_id) {
      return NextResponse.json({ error: 'lesson_id is required' }, { status: 400 });
    }

    // Get conference details
    const { data: conference, error: conferenceError } = await tq
      .from('video_conferences')
      .select('id, course_id, instructor_id, title, lesson_id')
      .eq('id', conferenceId)
      .single();

    if (conferenceError || !conference) {
      return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
    }

    // Check if user is instructor or admin
    const { data: userData } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userData?.role || '');
    const isInstructor = conference.instructor_id === user.id;

    if (!isAdmin && !isInstructor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get recording URL if recording_id is provided
    let recordingUrl = null;
    let recordingTitle = title || `Session Recording - ${conference.title}`;

    if (recording_id) {
      const { data: recording } = await tq
        .from('conference_recordings')
        .select('recording_url, title')
        .eq('id', recording_id)
        .eq('conference_id', conferenceId)
        .single();

      if (recording) {
        recordingUrl = recording.recording_url;
        recordingTitle = title || recording.title || recordingTitle;
      }
    }

    if (!recordingUrl) {
      return NextResponse.json({ error: 'No recording found for this conference' }, { status: 400 });
    }

    // Get the lesson
    const { data: lesson, error: lessonError } = await tq
      .from('lessons')
      .select('id, title, content, course_id')
      .eq('id', lesson_id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Verify lesson belongs to the same course (or allow admin)
    if (!isAdmin && lesson.course_id !== conference.course_id) {
      return NextResponse.json({ error: 'Lesson must be in the same course as the conference' }, { status: 400 });
    }

    // Parse existing content
    let content = [];
    try {
      content = lesson.content ? (typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content) : [];
    } catch {
      content = [];
    }

    // Create new video content item
    const videoContentItem = {
      id: `recording-${conferenceId}-${Date.now()}`,
      type: 'video',
      title: recordingTitle,
      data: {
        url: recordingUrl,
        title: recordingTitle,
        description: description || `Recording from live session: ${conference.title}`,
        isRecording: true,
        conferenceId: conferenceId,
        addedAt: new Date().toISOString()
      }
    };

    // Add to content array
    content.push(videoContentItem);

    // Update the lesson
    const { error: updateError } = await tq
      .from('lessons')
      .update({ content })
      .eq('id', lesson_id);

    if (updateError) {
      console.error('Error updating lesson:', updateError);
      return NextResponse.json({ error: 'Failed to add recording to lesson' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Recording added to lesson successfully',
      lesson_id,
      content_item: videoContentItem
    });
  } catch (error) {
    console.error('Error in add-to-lesson POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
