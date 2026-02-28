import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get all courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Courses list result:', { courses, error });

    if (error) {
      console.error('Courses fetch error:', error);
      return NextResponse.json({ 
        error: "Failed to fetch courses", 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      count: courses?.length || 0,
      courses: courses || [],
      message: courses?.length === 0 ? "No courses found in database" : "Courses found"
    });

  } catch (error) {
    console.error('Courses list error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
