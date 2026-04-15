import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

/**
 * GET /api/conferences/[id]/attendance
 * Get attendance report for a conference
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

    // Get conference details
    const { data: conference, error: conferenceError } = await tq
      .from('video_conferences')
      .select('id, title, course_id, instructor_id, scheduled_at, status')
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
      // Check if user is a course instructor
      const { data: courseInstructor } = await tq
        .from('course_instructors')
        .select('id')
        .eq('course_id', conference.course_id)
        .eq('instructor_id', user.id)
        .single();

      if (!courseInstructor) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get all participants with their attendance data
    // Note: name is in users table, avatar is in user_profiles
    const { data: participants, error: participantsError } = await tq
      .from('conference_participants')
      .select(`
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
      `)
      .eq('conference_id', conferenceId)
      .order('joined_at', { ascending: true });

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    // Get avatars from user_profiles for all participants
    const userIds = participants?.map(p => p.user_id).filter(Boolean) || [];
    let avatarMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await tq
        .from('user_profiles')
        .select('user_id, avatar')
        .in('user_id', userIds);

      if (profiles) {
        avatarMap = profiles.reduce((acc, p) => {
          if (p.user_id && p.avatar) {
            acc[p.user_id] = p.avatar;
          }
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // For ended/cancelled conferences, determine the end time
    const conferenceEnded = conference.status === 'ended' || conference.status === 'cancelled';

    // Backfill left_at for ended conferences — set left_at = now for participants
    // who never had their leave recorded (tab close, etc.)
    if (conferenceEnded && participants) {
      const staleParticipantIds = participants
        .filter(p => !p.left_at)
        .map(p => p.id);

      if (staleParticipantIds.length > 0) {
        const now = new Date().toISOString();
        await tq
          .from('conference_participants')
          .update({ left_at: now })
          .in('id', staleParticipantIds);

        // Update local data to reflect the backfill
        for (const p of participants) {
          if (!p.left_at) {
            p.left_at = now;
          }
        }
      }
    }

    // Calculate attendance statistics
    const attendanceReport = (participants || []).map(p => {
      const joinedAt = p.joined_at ? new Date(p.joined_at) : null;
      const leftAt = p.left_at ? new Date(p.left_at) : null;

      let durationMinutes = 0;
      const effectiveLeftAt = leftAt;
      let status: 'active' | 'left' = p.left_at ? 'left' : 'active';

      if (joinedAt && leftAt) {
        durationMinutes = Math.round((leftAt.getTime() - joinedAt.getTime()) / 60000);
      } else if (joinedAt && !leftAt) {
        if (conferenceEnded) {
          // Conference has ended — user didn't explicitly leave (tab close, etc.)
          // Use the current time as a reasonable end marker, but mark them as "left"
          durationMinutes = Math.round((Date.now() - joinedAt.getTime()) / 60000);
          status = 'left';
        } else {
          // Conference is still live — user is genuinely active
          durationMinutes = Math.round((Date.now() - joinedAt.getTime()) / 60000);
        }
      }

      const userRecord = p.user as unknown as { id: string; email: string; name: string } | null;

      return {
        id: p.id,
        user_id: p.user_id,
        name: userRecord?.name || userRecord?.email || 'Unknown',
        email: userRecord?.email,
        avatar: p.user_id ? avatarMap[p.user_id] : undefined,
        role: p.role,
        joined_at: p.joined_at,
        left_at: p.left_at,
        duration_minutes: durationMinutes,
        status
      };
    });

    // Summary statistics
    const totalParticipants = attendanceReport.length;
    const activeParticipants = attendanceReport.filter(p => p.status === 'active').length;
    const avgDuration = totalParticipants > 0
      ? Math.round(attendanceReport.reduce((sum, p) => sum + p.duration_minutes, 0) / totalParticipants)
      : 0;

    return NextResponse.json({
      conference: {
        id: conference.id,
        title: conference.title,
        scheduled_at: conference.scheduled_at,
        status: conference.status
      },
      attendance: attendanceReport,
      summary: {
        total_participants: totalParticipants,
        active_participants: activeParticipants,
        average_duration_minutes: avgDuration
      }
    });
  } catch (error) {
    console.error('Error in attendance GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
