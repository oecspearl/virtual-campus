import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/forums/[id] - Get a specific forum with posts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get forum details
    const { data: forum, error: forumError } = await tq
      .from("lecturer_forums")
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .eq("id", id)
      .single();

    if (forumError || !forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Increment view count
    await tq
      .from("lecturer_forums")
      .update({ view_count: (forum.view_count || 0) + 1 })
      .eq("id", id);

    // Get posts for this forum
    const { data: posts, error: postsError } = await tq
      .from("lecturer_forum_posts")
      .select(`
        *,
        author:users!author_id(id, name, email),
        reply_count,
        vote_count
      `)
      .eq("forum_id", id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
    }

    return NextResponse.json({
      forum: {
        ...forum,
        view_count: (forum.view_count || 0) + 1
      },
      posts: posts || []
    });
  } catch (error) {
    console.error("Get forum API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/lecturers/forums/[id] - Update a forum
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if user is the creator or admin
    const { data: forum } = await tq
      .from("lecturer_forums")
      .select("created_by")
      .eq("id", id)
      .single();

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (forum.created_by !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, category, subject_area, is_pinned, is_locked } = body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category;
    if (subject_area !== undefined) updateData.subject_area = subject_area || null;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_locked !== undefined) updateData.is_locked = is_locked;

    const { data: updatedForum, error } = await tq
      .from("lecturer_forums")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating forum:", error);
      return NextResponse.json({ error: "Failed to update forum" }, { status: 500 });
    }

    return NextResponse.json({ forum: updatedForum });
  } catch (error) {
    console.error("Update forum API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/forums/[id] - Delete a forum
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if user is the creator or admin
    const { data: forum } = await tq
      .from("lecturer_forums")
      .select("created_by")
      .eq("id", id)
      .single();

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (forum.created_by !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await tq
      .from("lecturer_forums")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting forum:", error);
      return NextResponse.json({ error: "Failed to delete forum" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete forum API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

