import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/forums/posts/[id] - Get a specific post with replies
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    // Get post details
    const { data: post, error: postError } = await tq
      .from("lecturer_forum_posts")
      .select(`
        *,
        author:users!author_id(id, name, email),
        forum:lecturer_forums!lecturer_forum_posts_forum_id_fkey(id, title, category)
      `)
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment view count
    await tq
      .from("lecturer_forum_posts")
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq("id", postId);

    // Get replies
    const { data: replies, error: repliesError } = await tq
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

    if (repliesError) {
      console.error("Error fetching replies:", repliesError);
    }

    // Get nested replies for each top-level reply
    const repliesWithNested = await Promise.all(
      (replies || []).map(async (reply) => {
        const { data: nestedReplies } = await tq
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

    return NextResponse.json({
      post: {
        ...post,
        view_count: (post.view_count || 0) + 1
      },
      replies: repliesWithNested
    });
  } catch (error) {
    console.error("Get post API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/lecturers/forums/posts/[id] - Update a post
export async function PUT(
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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is the author or admin
    const { data: post } = await tq
      .from("lecturer_forum_posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (post.author_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, is_pinned, is_locked } = body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_locked !== undefined) updateData.is_locked = is_locked;

    const { data: updatedPost, error } = await tq
      .from("lecturer_forum_posts")
      .update(updateData)
      .eq("id", postId)
      .select(`
        *,
        author:users!lecturer_forum_posts_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating post:", error);
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error("Update post API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/forums/posts/[id] - Delete a post
export async function DELETE(
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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is the author or admin
    const { data: post } = await tq
      .from("lecturer_forum_posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (post.author_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await tq
      .from("lecturer_forum_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      console.error("Error deleting post:", error);
      return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete post API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

