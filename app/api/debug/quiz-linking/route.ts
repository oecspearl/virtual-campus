import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    
    if (!courseId) {
      return NextResponse.json({ error: "courseId parameter is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get course information
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if course_id column exists in quizzes table
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'quizzes' });

    // Get all quizzes with their relationships
    const { data: allQuizzes, error: allQuizzesError } = await supabase
      .from("quizzes")
      .select(`
        id,
        title,
        lesson_id,
        course_id,
        created_at,
        lessons!quizzes_lesson_id_fkey(id, title, course_id),
        courses!quizzes_course_id_fkey(id, title)
      `)
      .order("created_at", { ascending: false });

    // Get lessons for this course
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, title, course_id")
      .eq("course_id", courseId);

    // Get quizzes linked through lessons
    let lessonQuizzes = [];
    if (!lessonsError && lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      
      const { data: quizzes, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
        .in("lesson_id", lessonIds);

      if (!quizzesError && quizzes) {
        lessonQuizzes = quizzes;
      }
    }

    // Get quizzes with direct course_id
    const { data: directQuizzes, error: directQuizzesError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("course_id", courseId);

    // Get grade items for this course
    const { data: gradeItems, error: gradeItemsError } = await supabase
      .from("course_grade_items")
      .select("*")
      .eq("course_id", courseId);

    // Get quiz attempts for this course
    const { data: quizAttempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select(`
        id,
        quiz_id,
        student_id,
        score,
        status,
        quizzes!quiz_attempts_quiz_id_fkey(id, title, lesson_id, course_id)
      `)
      .eq("course_id", courseId);

    return NextResponse.json({
      course,
      debug: {
        courseId,
        hasCourseIdColumn: allQuizzes?.some(q => q.course_id !== null) || false,
        totalQuizzes: allQuizzes?.length || 0,
        lessonsCount: lessons?.length || 0,
        lessonQuizzesCount: lessonQuizzes?.length || 0,
        directQuizzesCount: directQuizzes?.length || 0,
        gradeItemsCount: gradeItems?.length || 0,
        quizAttemptsCount: quizAttempts?.length || 0
      },
      allQuizzes: allQuizzes || [],
      lessons: lessons || [],
      lessonQuizzes: lessonQuizzes || [],
      directQuizzes: directQuizzes || [],
      gradeItems: gradeItems || [],
      quizAttempts: quizAttempts || [],
      recommendations: {
        needsCourseIdUpdate: lessonQuizzes.length > 0 && directQuizzes.length === 0,
        hasQuizAttempts: quizAttempts.length > 0,
        hasGradeItems: gradeItems.length > 0
      }
    });

  } catch (e: any) {
    console.error('Debug quiz linking API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
