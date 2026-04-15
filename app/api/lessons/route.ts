import { NextResponse } from "next/server";
import { withTenantAuth } from "@/lib/with-tenant-auth";
import { hasRole } from "@/lib/rbac";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export const GET = withTenantAuth(async ({ user, tq, request }) => {
  const { searchParams } = new URL(request.url);
  const subject_id = searchParams.get("subject_id");
  const course_id = searchParams.get("course_id");

  const isInstructor = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);

  let query = tq.from("lessons").select(`
    *,
    courses(title)
  `);

  if (subject_id) {
    query = query.eq("subject_id", subject_id);
  } else if (course_id) {
    // Get lessons for a course (direct course_id only since we removed subjects)
    query = query.eq("course_id", course_id);
  }

  // Order by the order field to ensure consistent sequence
  query = query.order("order", { ascending: true });

  const { data: lessons, error } = await query.limit(200);

  if (error) {
    console.error('Lessons fetch error:', error);
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
  }

  // Filter lessons for students:
  // 1. Only show published lessons
  // 2. Only show shared lessons (class_id IS NULL) + lessons for their enrolled section
  let filteredLessons = lessons || [];
  if (!isInstructor) {
    // Get student's enrolled class_ids for this course
    let enrolledClassIds: string[] = [];
    if (course_id) {
      const { data: enrollments } = await tq.from("enrollments")
        .select("class_id")
        .eq("student_id", user.id)
        .eq("course_id", course_id)
        .eq("status", "active");
      enrolledClassIds = (enrollments || [])
        .map((e: any) => e.class_id)
        .filter(Boolean);
    }

    filteredLessons = lessons.filter((lesson: any) => {
      if (!lesson.published) return false;
      // Shared lesson (no class_id) — visible to all
      if (!lesson.class_id) return true;
      // Section-specific — only if enrolled in that section
      return enrolledClassIds.includes(lesson.class_id);
    });
  }

  // Ensure lessons maintain their order after filtering
  filteredLessons.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  return NextResponse.json({ lessons: filteredLessons });
});

export const POST = withTenantAuth(async ({ user, tq, request }) => {
  const body = await request.json();

  // Handle course_id directly - lessons exist only under courses
  const course_id = body.course_id;

  // Validate that we have course_id
  if (!course_id) {
    return NextResponse.json({ error: "course_id is required" }, { status: 400 });
  }

  // Create lesson data - lessons exist directly under courses
  const lessonData: any = {
    title: String(body.title || "Untitled Lesson"),
    description: String(body.description || ""),
    order: Number(body.order ?? 0),
    learning_outcomes: Array.isArray(body.learning_outcomes) ? body.learning_outcomes : [],
    lesson_instructions: String(body.lesson_instructions || ""),
    content: Array.isArray(body.content) ? body.content : [],
    resources: Array.isArray(body.resources) ? body.resources : [],
    estimated_time: Number(body.estimated_time ?? 0),
    difficulty: Number(body.difficulty ?? 1),
    published: Boolean(body.published ?? false),
  };

  // Add course_id directly - no subjects needed
  lessonData.course_id = course_id;

  // Optional: assign to a section (week) for weekly/topics format
  if (body.section_id) {
    lessonData.section_id = body.section_id;
  }

  // Optional: assign to a specific class/section instance
  // Lecturers can only create content for sections they are assigned to
  if (body.class_id) {
    if (!hasRole(user.role, ["admin", "super_admin"])) {
      const serviceSupabase = createServiceSupabaseClient();
      const { data: ci } = await serviceSupabase
        .from('class_instructors')
        .select('id')
        .eq('class_id', body.class_id)
        .eq('instructor_id', user.id)
        .limit(1);

      const { data: cf } = !ci?.length ? await serviceSupabase
        .from('cohort_facilitators')
        .select('id')
        .eq('cohort_id', body.class_id)
        .eq('user_id', user.id)
        .limit(1) : { data: ci };

      if (!cf?.length) {
        return NextResponse.json({
          error: "You can only add content to sections you are assigned to."
        }, { status: 403 });
      }
    }
    lessonData.class_id = body.class_id;
  }

  const { data: lesson, error } = await tq.from("lessons")
    .insert([lessonData])
    .select()
    .single();

  if (error) {
    console.error('Lesson creation error:', error);

    // Provide specific error messages based on the error type
    if (error.code === 'PGRST116' || (error.message && error.message.includes('column') && error.message.includes('does not exist'))) {
      return NextResponse.json({
        error: "Database schema error. The course_id column doesn't exist in the lessons table. Please run the database migration first."
      }, { status: 500 });
    } else if (error.code === '23503') {
      return NextResponse.json({
        error: "Invalid course_id. Please select a valid course."
      }, { status: 400 });
    } else if (error.code === '42501') {
      return NextResponse.json({
        error: "Permission denied. Please ensure you have the correct role and permissions."
      }, { status: 403 });
    } else if (error.code === '42P01') {
      return NextResponse.json({
        error: "Database table not found. Please ensure the lessons table exists and run the database migration."
      }, { status: 500 });
    } else {
      return NextResponse.json({
        error: `Failed to create lesson: ${error.message || 'Unknown database error'}`
      }, { status: 500 });
    }
  }

  return NextResponse.json(lesson);
}, { requiredRoles: ['instructor', 'curriculum_designer', 'admin', 'super_admin'] as const });
