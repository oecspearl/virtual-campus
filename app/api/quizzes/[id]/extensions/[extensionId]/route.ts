import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; extensionId: string }> }
) {
  try {
    const { extensionId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!hasRole(authResult.userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createServiceSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.extended_due_date !== undefined) updateData.extended_due_date = body.extended_due_date || null;
    if (body.extended_available_until !== undefined) updateData.extended_available_until = body.extended_available_until || null;
    if (body.extra_time_minutes !== undefined) updateData.extra_time_minutes = body.extra_time_minutes != null ? Number(body.extra_time_minutes) : null;
    if (body.extra_attempts !== undefined) updateData.extra_attempts = body.extra_attempts != null ? Number(body.extra_attempts) : null;
    if (body.reason !== undefined) updateData.reason = body.reason || null;

    const { data: extension, error } = await supabase
      .from("quiz_extensions")
      .update(updateData)
      .eq("id", extensionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating quiz extension:", error);
      return NextResponse.json({ error: "Failed to update extension" }, { status: 500 });
    }

    return NextResponse.json({ extension });
  } catch (e: any) {
    console.error("Quiz extension PUT error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; extensionId: string }> }
) {
  try {
    const { extensionId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!hasRole(authResult.userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const supabase = createServiceSupabaseClient();

    const { error } = await supabase
      .from("quiz_extensions")
      .delete()
      .eq("id", extensionId);

    if (error) {
      console.error("Error deleting quiz extension:", error);
      return NextResponse.json({ error: "Failed to delete extension" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Quiz extension DELETE error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
