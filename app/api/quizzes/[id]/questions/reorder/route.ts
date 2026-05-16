import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createLogger } from "@/lib/logger";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = createLogger('api/quizzes/[id]/questions/reorder', request as any);
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) return createAuthResponse("Forbidden", 403);
    
    const body = await request.json();
    const order = (body.order as { id: string; order: number }[]) ?? [];
    const supabase = await createServerSupabaseClient();
    
    // Update each question's order
    const updates = order.map((o) => 
      supabase
        .from("questions")
        .update({ 
          order: o.order, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", o.id)
    );
    
    const results = await Promise.all(updates);
    
    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      log.error('Question reorder had errors', { quizId: id, failed: errors.length });
      return NextResponse.json({ error: "Failed to reorder questions" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    log.error('PUT handler crashed', undefined, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
