import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      console.error('Question reorder errors:', errors);
      return NextResponse.json({ error: "Failed to reorder questions" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Question reorder API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
