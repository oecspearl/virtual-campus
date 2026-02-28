import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
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
