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

    // Get all lessons for this course
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, title, course_id")
      .eq("course_id", courseId);

    // Get all quizzes (both with and without course_id)
    const { data: allQuizzes, error: allQuizzesError } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: true });

    // Get quizzes linked to lessons in this course
    let courseQuizzes = [];
    if (!lessonsError && lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      
      const { data: quizzes, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
        .in("lesson_id", lessonIds);

      if (!quizzesError && quizzes) {
        courseQuizzes = quizzes.map(quiz => {
          const lesson = lessons.find(l => l.id === quiz.lesson_id);
          return {
            ...quiz,
            lesson_title: lesson?.title || 'Unknown Lesson',
            lesson_course_id: lesson?.course_id
          };
        });
      }
    }

    // Get quizzes with direct course_id
    const { data: directCourseQuizzes, error: directQuizzesError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("course_id", courseId);

    // Get grade items for this course
    const { data: gradeItems, error: itemsError } = await supabase
      .from("course_grade_items")
      .select("*")
      .eq("course_id", courseId);

    return NextResponse.json({
      course,
      lessons: lessons || [],
      allQuizzes: allQuizzes || [],
      courseQuizzes: courseQuizzes || [],
      directCourseQuizzes: directCourseQuizzes || [],
      gradeItems: gradeItems || [],
      debug: {
        courseId,
        lessonsCount: lessons?.length || 0,
        allQuizzesCount: allQuizzes?.length || 0,
        courseQuizzesCount: courseQuizzes?.length || 0,
        directCourseQuizzesCount: directCourseQuizzes?.length || 0,
        gradeItemsCount: gradeItems?.length || 0
      }
    });

  } catch (e: any) {
    console.error('Debug gradebook quizzes API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
