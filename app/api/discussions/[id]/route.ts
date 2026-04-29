import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { requireCourseAccess } from "@/lib/enrollment-check";

// GET /api/discussions/[id] - Get a specific discussion with replies
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;
    console.log('Fetching discussion:', discussionId);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get discussion with author info
    const { data: discussion, error: discussionError } = await tq
      .from('course_discussions')
      .select(`
        *,
        author:users!course_discussions_author_id_fkey(id, name, email),
        votes:discussion_votes(count)
      `)
      .eq('id', discussionId)
      .single();

    if (discussionError) {
      console.error('Error fetching discussion:', discussionError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Enrollment / public-course gate. course_discussions has a course_id;
    // students can only read threads for courses they're enrolled in (or
    // for is_public courses).
    if (discussion?.course_id) {
      const authResult = await authenticateUser(request as any);
      const user = authResult.success ? { id: authResult.user.id, role: authResult.userProfile!.role } : null;
      const access = await requireCourseAccess(user, discussion.course_id);
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: access.status });
      }
    }

    // Get replies with author info and nested structure
    const { data: replies, error: repliesError } = await tq
      .from('discussion_replies')
      .select(`
        *,
        author:users!discussion_replies_author_id_fkey(id, name, email),
        votes:discussion_votes(count)
      `)
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 });
    }

    // Organize replies into a tree structure
    const replyMap = new Map();
    const rootReplies = [];

    replies?.forEach(reply => {
      replyMap.set(reply.id, { ...reply, children: [] });
    });

    replies?.forEach(reply => {
      if (reply.parent_reply_id) {
        const parent = replyMap.get(reply.parent_reply_id);
        if (parent) {
          parent.children.push(replyMap.get(reply.id));
        }
      } else {
        rootReplies.push(replyMap.get(reply.id));
      }
    });

    console.log('Discussion fetched successfully with', rootReplies.length, 'root replies');
    return NextResponse.json({ 
      discussion, 
      replies: rootReplies 
    });

  } catch (error) {
    console.error('Discussion API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/discussions/[id] - Update a discussion
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;
    console.log('Updating discussion:', discussionId);

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const body = await request.json();
    const {
      title,
      content,
      is_pinned,
      is_locked,
      // Grading fields
      is_graded,
      points,
      rubric,
      due_date,
      grading_criteria,
      min_replies,
      min_words,
      show_in_curriculum,
      curriculum_order
    } = body;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user owns the discussion or is an admin
    const { data: existingDiscussion, error: fetchError } = await tq
      .from('course_discussions')
      .select('author_id')
      .eq('id', discussionId)
      .single();

    if (fetchError) {
      console.error('Error fetching discussion:', fetchError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Check if user is author or admin
    const { data: userProfile } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthor = existingDiscussion.author_id === user.id;
    const isAdmin = userProfile?.role && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_locked !== undefined) updateData.is_locked = is_locked;

    // Grading fields (only instructors/admins can set these)
    if (isAdmin && is_graded !== undefined) {
      updateData.is_graded = is_graded;
      if (is_graded) {
        if (points !== undefined) updateData.points = points;
        if (rubric !== undefined) updateData.rubric = rubric;
        if (due_date !== undefined) updateData.due_date = due_date;
        if (grading_criteria !== undefined) updateData.grading_criteria = grading_criteria;
        if (min_replies !== undefined) updateData.min_replies = min_replies;
        if (min_words !== undefined) updateData.min_words = min_words;
        if (show_in_curriculum !== undefined) updateData.show_in_curriculum = show_in_curriculum;
        if (curriculum_order !== undefined) updateData.curriculum_order = curriculum_order;
      } else {
        // Clear grading fields if turning off grading
        updateData.points = null;
        updateData.rubric = null;
        updateData.due_date = null;
        updateData.grading_criteria = null;
        updateData.min_replies = null;
        updateData.min_words = null;
        updateData.show_in_curriculum = false;
        updateData.curriculum_order = null;
      }
    }

    const { data: discussion, error } = await tq
      .from('course_discussions')
      .update(updateData)
      .eq('id', discussionId)
      .select(`
        *,
        author:users!course_discussions_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating discussion:', error);
      return NextResponse.json({ error: "Failed to update discussion" }, { status: 500 });
    }

    console.log('Discussion updated successfully');
    return NextResponse.json(discussion);

  } catch (error) {
    console.error('Update discussion error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/discussions/[id] - Delete a discussion
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;
    console.log('Deleting discussion:', discussionId);

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user owns the discussion or is an admin
    const { data: existingDiscussion, error: fetchError } = await tq
      .from('course_discussions')
      .select('author_id')
      .eq('id', discussionId)
      .single();

    if (fetchError) {
      console.error('Error fetching discussion:', fetchError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Check if user is author or admin
    const { data: userProfile } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthor = existingDiscussion.author_id === user.id;
    const isAdmin = userProfile?.role && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await tq
      .from('course_discussions')
      .delete()
      .eq('id', discussionId);

    if (error) {
      console.error('Error deleting discussion:', error);
      return NextResponse.json({ error: "Failed to delete discussion" }, { status: 500 });
    }

    console.log('Discussion deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete discussion error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
