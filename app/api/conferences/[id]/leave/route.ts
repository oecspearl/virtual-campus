import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

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

      // Auto-snapshot all attached whiteboards
      try {
        const { data: confWhiteboards } = await tq
          .from('conference_whiteboards')
          .select('whiteboard_id, whiteboard:whiteboards(id, elements, app_state, frames, auto_snapshot, title)')
          .eq('conference_id', conferenceId);

        if (confWhiteboards && confWhiteboards.length > 0) {
          const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          for (const cw of confWhiteboards) {
            const wb = cw.whiteboard as any;
            if (wb && wb.auto_snapshot) {
              await tq
                .from('whiteboard_versions')
                .insert({
                  whiteboard_id: wb.id,
                  saved_by: user.id,
                  label: `Auto-saved: ${wb.title} — ${now}`,
                  elements: wb.elements || [],
                  app_state: wb.app_state || {},
                  frames: wb.frames || [],
                });
            }
          }
        }
      } catch (snapshotError) {
        // Don't fail the leave operation if snapshot fails
        console.error('Error auto-snapshotting whiteboards:', snapshotError);
      }
    }

    return NextResponse.json({ message: 'Successfully left conference' });
  } catch (error) {
    console.error('Error in conference leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
