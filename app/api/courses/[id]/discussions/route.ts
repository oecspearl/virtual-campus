import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { notifyCourseAnnouncement } from "@/lib/notifications";
import { hasRole } from "@/lib/rbac";

// GET /api/courses/[id]/discussions - Get all discussions for a course
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params;
    console.log('Fetching discussions for course:', courseId);

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Get discussions with author information and reply counts
    const { data: discussions, error } = await tq
      .from('course_discussions')
      .select(`
        *,
        author:users!course_discussions_author_id_fkey(id, name, email),
        replies:discussion_replies(count),
        votes:discussion_votes(count)
      `)
      .eq('course_id', courseId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discussions:', error);
      return NextResponse.json({ error: "Failed to fetch discussions" }, { status: 500 });
    }

    console.log('Discussions fetched successfully:', discussions?.length || 0);
    return NextResponse.json({ discussions: discussions || [] });

  } catch (error) {
    console.error('Discussions API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/courses/[id]/discussions - Create a new discussion
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params;
    console.log('Creating discussion for course:', courseId);

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    console.log('Creating discussion for user:', user.id);

    const body = await request.json();
    const {
      title,
      content,
      is_pinned = false,
      is_locked = false,
      // Grading fields
      is_graded = false,
      points,
      rubric,
      due_date,
      grading_criteria,
      min_replies,
      min_words,
      show_in_curriculum = false,
      curriculum_order
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const { data: discussion, error } = await tq
      .from('course_discussions')
      .insert([{
        course_id: courseId,
        title: title.trim(),
        content: content.trim(),
        author_id: user.id,
        is_pinned,
        is_locked,
        // Grading fields
        is_graded,
        points: is_graded ? points : null,
        rubric: is_graded ? rubric : null,
        due_date: is_graded ? due_date : null,
        grading_criteria: is_graded ? grading_criteria : null,
        min_replies: is_graded ? (min_replies || 0) : null,
        min_words: is_graded ? (min_words || 0) : null,
        show_in_curriculum: is_graded ? show_in_curriculum : false,
        curriculum_order: is_graded ? curriculum_order : null
      }])
      .select(`
        *,
        author:users!course_discussions_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating discussion:', error);
      return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
    }

    // If this is a pinned discussion or created by instructor/admin, send announcement notification
    const isInstructor = await checkIsInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if ((is_pinned || isInstructor || isAdmin) && discussion) {
      // Get course details
      const { data: course } = await tq
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();

      if (course) {
        // Get all enrolled students
        const { data: enrollments } = await tq
          .from('enrollments')
          .select('student_id')
          .eq('course_id', courseId)
          .eq('status', 'active');

        // Send announcement to all enrolled students (in background, don't wait)
        if (enrollments && enrollments.length > 0) {
          const courseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org'}/courses/${courseId}`;
          const discussionUrl = `${courseUrl}/discussions/${discussion.id}`;

          // Strip HTML from content for email (first 200 chars)
          const plainContent = content.replace(/<[^>]*>/g, '').substring(0, 200);

          // Send notifications in background (don't block response)
          Promise.all(
            enrollments.map(enrollment =>
              notifyCourseAnnouncement(enrollment.student_id, {
                courseTitle: course.title,
                announcementTitle: title,
                announcementContent: plainContent,
                courseUrl: discussionUrl,
              }).catch(err => console.error(`Failed to notify student ${enrollment.student_id}:`, err))
            )
          ).catch(err => console.error('Error sending announcement notifications:', err));
        }
      }
    }

    console.log('Discussion created successfully:', discussion.id);
    return NextResponse.json(discussion);

  } catch (error) {
    console.error('Create discussion error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper to check if user is instructor
async function checkIsInstructor(tq: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await tq
    .from('course_instructors')
    .select('id')
    .eq('course_id', courseId)
    .eq('instructor_id', userId)
    .single();
  return !!data;
}
