import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/forums/posts/[id]/replies - Get replies for a post
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createServerSupabaseClient();
    
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const { data: replies, error } = await supabase
      .from("lecturer_forum_replies")
      .select(`
        *,
        author:users!author_id(id, name, email),
        vote_count
      `)
      .eq("post_id", postId)
      .is("parent_reply_id", null)
      .order("is_solution", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching replies:", error);
      return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 });
    }

    // Get nested replies
    const repliesWithNested = await Promise.all(
      (replies || []).map(async (reply) => {
        const { data: nestedReplies } = await supabase
          .from("lecturer_forum_replies")
          .select(`
            *,
            author:users!author_id(id, name, email),
            vote_count
          `)
          .eq("parent_reply_id", reply.id)
          .order("created_at", { ascending: true });

        return {
          ...reply,
          nested_replies: nestedReplies || []
        };
      })
    );

    return NextResponse.json({ replies: repliesWithNested });
  } catch (error) {
    console.error("Get replies API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/lecturers/forums/posts/[id]/replies - Create a reply
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const body = await request.json();
    const { content, parent_reply_id } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if post exists and is not locked
    const { data: post } = await supabase
      .from("lecturer_forum_posts")
      .select("is_locked, forum_id")
      .eq("id", postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if forum is locked
    const { data: forum } = await supabase
      .from("lecturer_forums")
      .select("is_locked")
      .eq("id", post.forum_id)
      .single();

    if (forum?.is_locked && !hasRole(userProfile?.role, ["admin", "super_admin"])) {
      return NextResponse.json({ error: "Forum is locked" }, { status: 403 });
    }

    if (post.is_locked && !hasRole(userProfile?.role, ["admin", "super_admin"])) {
      return NextResponse.json({ error: "Post is locked" }, { status: 403 });
    }

    const { data: reply, error } = await supabase
      .from("lecturer_forum_replies")
      .insert([{
        post_id: postId,
        parent_reply_id: parent_reply_id || null,
        content: content.trim(),
        author_id: user.id,
      }])
      .select(`
        *,
        author:users!lecturer_forum_replies_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error creating reply:", error);
      return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error("Create reply API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

