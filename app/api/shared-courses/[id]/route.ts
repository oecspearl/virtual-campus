import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

/**
 * GET /api/shared-courses/[id]
 * Get details of a shared course (id = course_shares.id)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id: shareId } = await params;

    // Get the share record
    const { data: share, error: shareError } = await tq.raw
      .from('course_shares')
      .select(`
        id,
        course_id,
        source_tenant_id,
        permission,
        can_enroll,
        can_add_supplemental_content,
        can_schedule_live_sessions,
        can_post_grades,
        allow_fork,
        created_at,
        source_tenant:tenants!course_shares_source_tenant_id_fkey(id, name, slug)
      `)
      .eq('id', shareId)
      .is('revoked_at', null)
      .or(`target_tenant_id.is.null,target_tenant_id.eq.${tenantId}`)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Shared course not found' }, { status: 404 });
    }

    // Get live course data from source tenant
    const { data: course, error: courseError } = await tq.raw
      .from('courses')
      .select('id, title, description, thumbnail, difficulty, subject_area, estimated_duration, modality, syllabus, course_format, start_date')
      .eq('id', share.course_id)
      .eq('published', true)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found or unpublished' }, { status: 404 });
    }

    // Fetch lessons, instructors, quizzes, assignments, discussions, and surveys in parallel
    const [
      lessonsResult,
      instructorsResult,
      quizzesResult,
      assignmentsResult,
      discussionsResult,
      surveysResult,
      sectionsResult,
      conferencesResult,
      resourceLinksResult,
      recordingsResult,
    ] = await Promise.all([
      // Lessons from source tenant (published only for students)
      tq.raw
        .from('lessons')
        .select('id, title, description, order, estimated_time, content_type, published, section_id, difficulty, prerequisite_lesson_id')
        .eq('course_id', share.course_id)
        .eq('published', true)
        .order('order', { ascending: true }),

      // Instructor info from source tenant
      tq.raw
        .from('course_instructors')
        .select(`
          instructor:users!course_instructors_instructor_id_fkey(id, name, email)
        `)
        .eq('course_id', share.course_id),

      // Quizzes from source tenant (published only)
      tq.raw
        .from('quizzes')
        .select('id, title, description, time_limit, passing_score, published')
        .eq('course_id', share.course_id)
        .eq('published', true)
        .order('created_at', { ascending: true }),

      // Assignments from source tenant (published only)
      tq.raw
        .from('assignments')
        .select('id, title, description, due_date, max_score, published')
        .eq('course_id', share.course_id)
        .eq('published', true)
        .order('created_at', { ascending: true }),

      // Graded discussions from source tenant
      tq.raw
        .from('discussions')
        .select('id, title, description, is_graded, max_score')
        .eq('course_id', share.course_id)
        .eq('is_graded', true)
        .order('created_at', { ascending: true }),

      // Surveys from source tenant (published only)
      tq.raw
        .from('surveys')
        .select('id, title, description, published')
        .eq('course_id', share.course_id)
        .eq('published', true)
        .order('created_at', { ascending: true }),

      // Course sections from source tenant
      tq.raw
        .from('course_sections')
        .select('id, course_id, title, description, order, start_date, end_date, collapsed, published')
        .eq('course_id', share.course_id)
        .eq('published', true)
        .order('order', { ascending: true }),

      // Video conferences from source tenant (scheduled or live only)
      tq.raw
        .from('video_conferences')
        .select(`
          id, title, description, status, meeting_url, video_provider, scheduled_at,
          instructor:users!video_conferences_instructor_id_fkey(id, name, email)
        `)
        .eq('course_id', share.course_id)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true }),

      // Resource links from source tenant (course-level)
      tq.raw
        .from('resource_links')
        .select('id, title, url, description, link_type, icon, order')
        .eq('course_id', share.course_id)
        .is('lesson_id', null)
        .order('order', { ascending: true }),

      // Conference recordings from source tenant
      tq.raw
        .from('conference_recordings')
        .select(`
          id, recording_url, title, recording_duration, created_at,
          conference:video_conferences!conference_recordings_conference_id_fkey(id, title, scheduled_at, course_id)
        `)
        .order('created_at', { ascending: false }),
    ]);

    // Target-tenant supplements attached to this share (visible to the
    // caller's tenant only — RLS handles isolation).
    const { data: supplements } = await tq
      .from('shared_course_supplements')
      .select(`
        id, kind, title, description, body, url, link_type, icon,
        position, published, created_at,
        author:users!shared_course_supplements_author_id_fkey(id, name)
      `)
      .eq('course_share_id', shareId)
      .eq('published', true)
      .order('position', { ascending: true });

    // Target-tenant live sessions scheduled for this share.
    const { data: localLiveSessions } = await tq
      .from('shared_course_live_sessions')
      .select(`
        id, title, description, scheduled_at, duration_minutes,
        meeting_url, provider, status,
        instructor:users!shared_course_live_sessions_instructor_id_fkey(id, name, email)
      `)
      .eq('course_share_id', shareId)
      .in('status', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true });

    // Check enrollment for current user
    const { data: enrollment } = await tq
      .from('cross_tenant_enrollments')
      .select('id, status, progress_percentage, enrolled_at, completed_at')
      .eq('source_course_id', share.course_id)
      .eq('student_id', authResult.user.id)
      .single();

    // Get lesson progress if enrolled
    const lessonProgress: Record<string, boolean> = {};
    if (enrollment) {
      const { data: progress } = await tq
        .from('cross_tenant_lesson_progress')
        .select('lesson_id, completed')
        .eq('enrollment_id', enrollment.id);

      if (progress) {
        for (const p of progress) {
          lessonProgress[p.lesson_id] = p.completed;
        }
      }
    }

    return NextResponse.json({
      share_id: share.id,
      permission: share.permission,
      can_enroll: (share as any).can_enroll ?? share.permission === 'enroll',
      can_add_supplemental_content: !!(share as any).can_add_supplemental_content,
      can_schedule_live_sessions: !!(share as any).can_schedule_live_sessions,
      can_post_grades: !!(share as any).can_post_grades,
      allow_fork: !!(share as any).allow_fork,
      source_tenant: share.source_tenant,
      course,
      lessons: (lessonsResult.data || []).map(l => ({
        ...l,
        completed: lessonProgress[l.id] || false,
      })),
      instructors: (instructorsResult.data || []).map(i => i.instructor),
      quizzes: quizzesResult.data || [],
      assignments: assignmentsResult.data || [],
      discussions: discussionsResult.data || [],
      surveys: surveysResult.data || [],
      sections: sectionsResult.data || [],
      conferences: conferencesResult.data || [],
      resource_links: resourceLinksResult.data || [],
      recordings: (recordingsResult.data || []).filter(
        (r: any) => r.conference?.course_id === share.course_id
      ),
      supplements: supplements || [],
      local_live_sessions: localLiveSessions || [],
      enrollment: enrollment || null,
    });
  } catch (error) {
    console.error('Error in shared course detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
