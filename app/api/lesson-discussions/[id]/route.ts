import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/lesson-discussions/[id] - Get a specific lesson discussion with replies
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;
    console.log('Fetching lesson discussion:', discussionId);

    const supabase = await createServerSupabaseClient();

    // Get discussion with author info
    const { data: discussion, error: discussionError } = await supabase
      .from('lesson_discussions')
      .select(`
        *,
        author:users!lesson_discussions_author_id_fkey(id, name, email),
        votes:lesson_discussion_votes(count)
      `)
      .eq('id', discussionId)
      .single();

    if (discussionError) {
      console.error('Error fetching lesson discussion:', discussionError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Get replies with author info and nested structure
    const { data: replies, error: repliesError } = await supabase
      .from('lesson_discussion_replies')
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

    console.log('Lesson discussion fetched successfully with', rootReplies.length, 'root replies');
    return NextResponse.json({ 
      discussion, 
      replies: rootReplies 
    });

  } catch (error) {
    console.error('Lesson discussion API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/lesson-discussions/[id] - Update a lesson discussion
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;
    console.log('Updating lesson discussion:', discussionId);

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const body = await request.json();
    const { title, content, is_pinned, is_locked } = body;

    const supabase = await createServerSupabaseClient();

    // Check if user owns the discussion or is an admin
    const { data: existingDiscussion, error: fetchError } = await supabase
      .from('lesson_discussions')
      .select('author_id')
      .eq('id', discussionId)
      .single();

    if (fetchError) {
      console.error('Error fetching lesson discussion:', fetchError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Check if user is author or admin
    const { data: userProfile } = await supabase
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

    const { data: discussion, error } = await supabase
      .from('lesson_discussions')
      .update(updateData)
      .eq('id', discussionId)
      .select(`
        *,
        author:users!lesson_discussions_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating lesson discussion:', error);
      return NextResponse.json({ error: "Failed to update discussion" }, { status: 500 });
    }

    console.log('Lesson discussion updated successfully');
    return NextResponse.json(discussion);

  } catch (error) {
    console.error('Update lesson discussion error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lesson-discussions/[id] - Delete a lesson discussion
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;
    console.log('Deleting lesson discussion:', discussionId);

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const supabase = await createServerSupabaseClient();

    // Check if user owns the discussion or is an admin
    const { data: existingDiscussion, error: fetchError } = await supabase
      .from('lesson_discussions')
      .select('author_id')
      .eq('id', discussionId)
      .single();

    if (fetchError) {
      console.error('Error fetching lesson discussion:', fetchError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    // Check if user is author or admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthor = existingDiscussion.author_id === user.id;
    const isAdmin = userProfile?.role && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase
      .from('lesson_discussions')
      .delete()
      .eq('id', discussionId);

    if (error) {
      console.error('Error deleting lesson discussion:', error);
      return NextResponse.json({ error: "Failed to delete discussion" }, { status: 500 });
    }

    console.log('Lesson discussion deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete lesson discussion error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
