import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get current user to check role
    const user = await getCurrentUser();
    const isInstructor = user && hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);

    const { data: lesson, error } = await tq.from("lessons")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      console.error('Lesson fetch error:', error);
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    
    // Check if lesson is published for students
    if (!isInstructor && lesson && !lesson.published) {
      return NextResponse.json({ error: "This lesson is not yet published" }, { status: 403 });
    }
    
    return NextResponse.json(lesson);
  } catch (e: any) {
    console.error('Lesson GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const body = await request.json();
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Prepare update data
    const updateData: any = {
      title: String(body.title || ""),
      description: String(body.description || ""),
      difficulty: Number(body.difficulty ?? 1),
      learning_outcomes: Array.isArray(body.learning_outcomes) ? body.learning_outcomes : [],
      lesson_instructions: String(body.lesson_instructions || ""),
      content: Array.isArray(body.content) ? body.content : [],
      resources: Array.isArray(body.resources) ? body.resources : [],
      estimated_time: Number(body.estimated_time ?? 0),
      published: Boolean(body.published ?? false),
      updated_at: new Date().toISOString()
    };
    
    const { data: lesson, error } = await tq.from("lessons")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      console.error('Lesson update error:', error);
      return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
    }
    
    return NextResponse.json(lesson);
  } catch (e: any) {
    console.error('Lesson PUT API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq.from("lessons")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error('Lesson delete error:', error);
      return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Lesson DELETE API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
