import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

/**
 * GET /api/conferences/[id]/recording
 * Get recordings for a conference
 */
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

    // Get recordings for this conference
    const { data: recordings, error } = await tq
      .from('conference_recordings')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recordings:', error);
      return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
    }

    return NextResponse.json({ recordings: recordings || [] });
  } catch (error) {
    console.error('Error in recording GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/conferences/[id]/recording
 * Add a recording to a conference (upload URL or file reference)
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
    const { recording_url, file_id, title, duration_seconds } = body;

    if (!recording_url && !file_id) {
      return NextResponse.json({
        error: 'Either recording_url or file_id is required'
      }, { status: 400 });
    }

    // Get conference details and verify authorization
    const { data: conference, error: conferenceError } = await tq
      .from('video_conferences')
      .select('id, course_id, instructor_id, title')
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

    // If file_id is provided, get the file URL
    let finalUrl = recording_url;
    let fileSize = null;

    if (file_id) {
      const { data: file } = await tq
        .from('files')
        .select('id, url, file_size')
        .eq('id', file_id)
        .single();

      if (file) {
        finalUrl = file.url || `/api/files/${file_id}`;
        fileSize = file.file_size;
      }
    }

    // Create recording record
    const { data: recording, error: recordingError } = await tq
      .from('conference_recordings')
      .insert({
        conference_id: conferenceId,
        recording_url: finalUrl,
        recording_duration: duration_seconds || null,
        file_size: fileSize,
        title: title || `Recording - ${conference.title}`,
        status: 'available'
      })
      .select()
      .single();

    if (recordingError) {
      console.error('Error creating recording:', recordingError);
      return NextResponse.json({ error: 'Failed to add recording' }, { status: 500 });
    }

    return NextResponse.json({ recording });
  } catch (error) {
    console.error('Error in recording POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/conferences/[id]/recording
 * Delete a recording
 */
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
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('recording_id');

    if (!recordingId) {
      return NextResponse.json({ error: 'recording_id is required' }, { status: 400 });
    }

    // Get conference details and verify authorization
    const { data: conference, error: conferenceError } = await tq
      .from('video_conferences')
      .select('id, instructor_id')
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

    const isAdmin = ['admin', 'super_admin'].includes(userData?.role || '');
    const isInstructor = conference.instructor_id === user.id;

    if (!isAdmin && !isInstructor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete recording
    const { error: deleteError } = await tq
      .from('conference_recordings')
      .delete()
      .eq('id', recordingId)
      .eq('conference_id', conferenceId);

    if (deleteError) {
      console.error('Error deleting recording:', deleteError);
      return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error in recording DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
