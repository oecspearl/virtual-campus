import { NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { createLogger } from "@/lib/logger";

// GET /api/lessons/[id]/discussions/[discussionId] - Get a specific lesson discussion with replies
export async function GET(request: Request, { params }: { params: Promise<{ id: string; discussionId: string }> }) {
  const log = createLogger('api/lessons/[id]/discussions/[discussionId]', request as any);
  try {
    const { id: lessonId, discussionId } = await params;

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
      log.error('Error fetching lesson discussion', { lessonId, discussionId }, discussionError);
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
      log.error('Error fetching lesson discussion replies', { discussionId }, repliesError);
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
    log.error('GET handler crashed', undefined, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/lessons/[id]/discussions/[discussionId] - Update a lesson discussion
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; discussionId: string }> }) {
  const log = createLogger('api/lessons/[id]/discussions/[discussionId]', request as any);
  try {
    const { id: lessonId, discussionId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;

    const body = await request.json();

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // First, check if the discussion exists and belongs to the user
    const { data: existingDiscussion, error: fetchError } = await tq.from('lesson_discussions')
      .select('id, author_id, lesson_id')
      .eq('id', discussionId)
      .eq('lesson_id', lessonId)
      .single();

    if (fetchError || !existingDiscussion) {
      log.error('Discussion not found', { lessonId, discussionId }, fetchError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    if (existingDiscussion.author_id !== user.id) {
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
      log.error('Error updating lesson discussion', { discussionId }, updateError);
      return NextResponse.json({ error: "Failed to update discussion" }, { status: 500 });
    }

    return NextResponse.json(updatedDiscussion);

  } catch (error) {
    log.error('PUT handler crashed', undefined, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lessons/[id]/discussions/[discussionId] - Delete a lesson discussion
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; discussionId: string }> }) {
  const log = createLogger('api/lessons/[id]/discussions/[discussionId]', request as any);
  try {
    const { id: lessonId, discussionId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // First, check if the discussion exists and belongs to the user
    const { data: existingDiscussion, error: fetchError } = await tq.from('lesson_discussions')
      .select('id, author_id, lesson_id')
      .eq('id', discussionId)
      .eq('lesson_id', lessonId)
      .single();

    if (fetchError || !existingDiscussion) {
      log.error('Discussion not found', { lessonId, discussionId }, fetchError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Allow author or admin/instructor roles to delete
    const isAdmin = userProfile?.role &&
      ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (existingDiscussion.author_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Not authorized to delete this discussion" }, { status: 403 });
    }

    // Delete the discussion (replies and votes will be cascade deleted)
    const { error: deleteError } = await tq.from('lesson_discussions')
      .delete()
      .eq('id', discussionId)
      .eq('lesson_id', lessonId);

    if (deleteError) {
      log.error('Error deleting lesson discussion', { discussionId }, deleteError);
      return NextResponse.json({ error: "Failed to delete discussion" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    log.error('DELETE handler crashed', undefined, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
