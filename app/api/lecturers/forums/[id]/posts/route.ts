import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/forums/[id]/posts - Get all posts in a forum
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: forumId } = await params;
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

    const { data: posts, error } = await tq
      .from("lecturer_forum_posts")
      .select(`
        *,
        author:users!author_id(id, name, email),
        reply_count,
        vote_count
      `)
      .eq("forum_id", forumId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    return NextResponse.json({ posts: posts || [] });
  } catch (error) {
    console.error("Get posts API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/lecturers/forums/[id]/posts - Create a new post
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: forumId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, is_pinned = false, is_locked = false } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if forum exists and is not locked
    const { data: forum } = await tq
      .from("lecturer_forums")
      .select("is_locked")
      .eq("id", forumId)
      .single();

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    if (forum.is_locked && !hasRole(userProfile?.role, ["admin", "super_admin"])) {
      return NextResponse.json({ error: "Forum is locked" }, { status: 403 });
    }

    const { data: post, error } = await tq
      .from("lecturer_forum_posts")
      .insert([{
        forum_id: forumId,
        title: title.trim(),
        content: content.trim(),
        author_id: user.id,
        is_pinned,
        is_locked
      }])
      .select(`
        *,
        author:users!lecturer_forum_posts_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error creating post:", error);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Create post API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

