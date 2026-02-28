import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: { user }, error: authError } = await tq.raw.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conferenceId } = await params;

    // Update participant record with leave time
    const { error: participantError } = await tq
      .from('conference_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('conference_id', conferenceId)
      .eq('user_id', user.id);

    if (participantError) {
      console.error('Error updating participant:', participantError);
      return NextResponse.json({ error: 'Failed to leave conference' }, { status: 500 });
    }

    // Check if this was the instructor leaving
    const { data: conference, error: conferenceError } = await tq
      .from('video_conferences')
      .select('instructor_id, status')
      .eq('id', conferenceId)
      .single();

    if (conferenceError) {
      console.error('Error fetching conference:', conferenceError);
      return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
    }

    // If instructor is leaving, end the conference
    if (conference.instructor_id === user.id && conference.status === 'live') {
      await tq
        .from('video_conferences')
        .update({ status: 'ended' })
        .eq('id', conferenceId);
    }

    return NextResponse.json({ message: 'Successfully left conference' });
  } catch (error) {
    console.error('Error in conference leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
