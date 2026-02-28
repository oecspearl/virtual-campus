import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('course_id', id)
      .order('order');
    
    if (error) {
      console.error('Subjects fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
    }
    
    return NextResponse.json({ subjects: subjects || [] });
  } catch (e: any) {
    console.error('Subjects API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const supabase = await createServerSupabaseClient();

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert([{
        course_id: id,
        title: String(body.title || "Untitled Subject"),
        description: String(body.description || ""),
        order: Number(body.order ?? 0),
        estimated_duration: String(body.estimated_duration || ""),
        learning_objectives: Array.isArray(body.learning_objectives) ? body.learning_objectives : [],
        published: Boolean(body.published ?? false),
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Subject creation error:', error);
      return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
    }
    
    return NextResponse.json(subject);
  } catch (e: any) {
    console.error('Subject creation API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
