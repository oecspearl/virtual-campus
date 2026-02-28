import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/forums - Get all forums
export async function GET(request: Request) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check authentication
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;

    // Check if user is a lecturer
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const subjectArea = searchParams.get("subject_area");

    let query = tq
      .from("lecturer_forums")
      .select(`
        *,
        created_by_user:users!created_by(id, name, email),
        post_count:lecturer_forum_posts(count)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    if (subjectArea) {
      query = query.eq("subject_area", subjectArea);
    }

    const { data: forums, error } = await query;

    if (error) {
      console.error("Error fetching forums:", error);
      return NextResponse.json({ error: "Failed to fetch forums" }, { status: 500 });
    }

    return NextResponse.json({ forums: forums || [] });
  } catch (error) {
    console.error("Forums API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/lecturers/forums - Create a new forum
export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    // Check if user is a lecturer
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, category = "general", subject_area } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: forum, error } = await tq
      .from("lecturer_forums")
      .insert([{
        title: title.trim(),
        description: description?.trim() || null,
        category,
        subject_area: subject_area || null,
        created_by: user.id,
      }])
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error creating forum:", error);
      return NextResponse.json({ error: "Failed to create forum" }, { status: 500 });
    }

    return NextResponse.json({ forum }, { status: 201 });
  } catch (error) {
    console.error("Create forum API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

