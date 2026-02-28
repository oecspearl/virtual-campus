import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");
    
    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Get quiz with all related data
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select(`
        *,
        lesson:lessons(
          *
        )
      `)
      .eq("id", quizId)
      .single();
    
    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found", details: quizError }, { status: 404 });
    }

    // Check if course_id column exists
    const { data: columns } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "quizzes")
      .eq("column_name", "course_id");

    const hasCourseIdColumn = columns && columns.length > 0;

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        lesson_id: quiz.lesson_id,
        course_id: quiz.course_id,
        hasCourseIdColumn
      },
      lesson: quiz.lesson ? {
        id: quiz.lesson.id,
        title: quiz.lesson.title,
        course_id: quiz.lesson.course_id
      } : null,
      resolvedCourseId: quiz.course_id || quiz.lesson?.course_id
    });

  } catch (error) {
    console.error('Debug quiz course error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
