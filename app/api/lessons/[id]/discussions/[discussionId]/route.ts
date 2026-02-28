import { NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

// GET /api/lessons/[id]/discussions/[discussionId] - Get a specific lesson discussion with replies
export async function GET(request: Request, { params }: { params: Promise<{ id: string; discussionId: string }> }) {
  try {
    const { id: lessonId, discussionId } = await params;
    console.log('Fetching lesson discussion:', { lessonId, discussionId });

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get discussion with author info
    const { data: discussion, error: discussionError } = await tq.from('lesson_discussions')
      .select(`
        *,
        author:users!lesson_discussions_author_id_fkey(id, name, email),
        votes:lesson_discussion_votes(count)
      `)
      .eq('id', discussionId)
      .eq('lesson_id', lessonId)
      .single();

    if (discussionError) {
      console.error('Error fetching lesson discussion:', discussionError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Get replies with author info and nested structure
    const { data: replies, error: repliesError } = await tq.from('lesson_discussion_replies')
      .select(`
        *,
        author:users!lesson_discussion_replies_author_id_fkey(id, name, email),
        votes:lesson_discussion_votes(count)
      `)
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Error fetching lesson discussion replies:', repliesError);
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

    return NextResponse.json({
      discussion,
      replies: rootReplies
    });

  } catch (error) {
    console.error('Lesson discussion API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/lessons/[id]/discussions/[discussionId] - Update a lesson discussion
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; discussionId: string }> }) {
  try {
    const { id: lessonId, discussionId } = await params;
    console.log('Updating lesson discussion:', { lessonId, discussionId });

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    console.log('Authenticated user:', { id: user.id });

    const body = await request.json();
    console.log('Update request body:', body);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // First, check if the discussion exists and belongs to the user
    const { data: existingDiscussion, error: fetchError } = await tq.from('lesson_discussions')
      .select('id, author_id, lesson_id')
      .eq('id', discussionId)
      .eq('lesson_id', lessonId)
      .single();

    if (fetchError || !existingDiscussion) {
      console.error('Discussion not found or access denied:', fetchError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    if (existingDiscussion.author_id !== user.id) {
      console.log('User not authorized to edit this discussion');
      return NextResponse.json({ error: "Not authorized to edit this discussion" }, { status: 403 });
    }

    // Update the discussion
    const { data: updatedDiscussion, error: updateError } = await tq.from('lesson_discussions')
      .update({
        title: body.title,
        content: body.content,
        updated_at: new Date().toISOString()
      })
      .eq('id', discussionId)
      .eq('lesson_id', lessonId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lesson discussion:', updateError);
      return NextResponse.json({ error: "Failed to update discussion" }, { status: 500 });
    }

    console.log('Lesson discussion updated successfully:', updatedDiscussion);
    return NextResponse.json(updatedDiscussion);

  } catch (error) {
    console.error('Lesson discussion update API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lessons/[id]/discussions/[discussionId] - Delete a lesson discussion
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; discussionId: string }> }) {
  try {
    const { id: lessonId, discussionId } = await params;
    console.log('Deleting lesson discussion:', { lessonId, discussionId });

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    console.log('Authenticated user:', { id: user.id });

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // First, check if the discussion exists and belongs to the user
    const { data: existingDiscussion, error: fetchError } = await tq.from('lesson_discussions')
      .select('id, author_id, lesson_id')
      .eq('id', discussionId)
      .eq('lesson_id', lessonId)
      .single();

    if (fetchError || !existingDiscussion) {
      console.error('Discussion not found or access denied:', fetchError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Allow author or admin/instructor roles to delete
    const isAdmin = userProfile?.role &&
      ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (existingDiscussion.author_id !== user.id && !isAdmin) {
      console.log('User not authorized to delete this discussion');
      return NextResponse.json({ error: "Not authorized to delete this discussion" }, { status: 403 });
    }

    // Delete the discussion (replies and votes will be cascade deleted)
    const { error: deleteError } = await tq.from('lesson_discussions')
      .delete()
      .eq('id', discussionId)
      .eq('lesson_id', lessonId);

    if (deleteError) {
      console.error('Error deleting lesson discussion:', deleteError);
      return NextResponse.json({ error: "Failed to delete discussion" }, { status: 500 });
    }

    console.log('Lesson discussion deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Lesson discussion delete API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
