import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// POST /api/lesson-discussions/[id]/replies - Create a new lesson discussion reply
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;
    console.log('Creating reply for lesson discussion:', discussionId);

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const body = await request.json();
    const { content, parent_reply_id, is_solution = false } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if discussion exists and is not locked
    const { data: discussion, error: discussionError } = await supabase
      .from('lesson_discussions')
      .select('is_locked')
      .eq('id', discussionId)
      .single();

    if (discussionError) {
      console.error('Error fetching lesson discussion:', discussionError);
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    if (discussion.is_locked) {
      return NextResponse.json({ error: "This discussion is locked" }, { status: 403 });
    }

    // If this is a solution, mark other solutions as not solutions
    if (is_solution) {
      await supabase
        .from('lesson_discussion_replies')
        .update({ is_solution: false })
        .eq('discussion_id', discussionId);
    }

    const { data: reply, error } = await supabase
      .from('lesson_discussion_replies')
      .insert([{
        discussion_id: discussionId,
        parent_reply_id: parent_reply_id || null,
        author_id: user.id,
        content: content.trim(),
        is_solution
      }])
      .select(`
        *,
        author:users!lesson_discussion_replies_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating lesson discussion reply:', error);
      return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
    }

    console.log('Lesson discussion reply created successfully:', reply.id);
    return NextResponse.json(reply);

  } catch (error) {
    console.error('Create lesson discussion reply error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
