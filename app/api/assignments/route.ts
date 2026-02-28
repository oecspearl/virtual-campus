import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lesson_id");
    const courseId = searchParams.get("course_id");
    const published = searchParams.get("published");

    let query = supabase.from("assignments").select("*");

    // Apply filters
    if (lessonId) query = query.eq("lesson_id", lessonId);
    if (published !== null) query = query.eq("published", published === "true");

    // For course_id filter: also include assignments linked via lesson_id
    if (courseId) {
      // Get all lesson IDs belonging to this course
      const { data: courseLessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", courseId);

      const lessonIds = courseLessons?.map((l: any) => l.id) || [];

      if (lessonIds.length > 0) {
        // Match assignments by course_id OR by lesson_id belonging to the course
        query = query.or(`course_id.eq.${courseId},lesson_id.in.(${lessonIds.join(",")})`);
      } else {
        query = query.eq("course_id", courseId);
      }
    }

    const { data: assignments, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error('Assignments fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }

    // Parse rubric JSON strings back to arrays for all assignments
    const parsedAssignments = assignments?.map(assignment => {
      if (assignment.rubric && typeof assignment.rubric === 'string') {
        try {
          assignment.rubric = JSON.parse(assignment.rubric);
        } catch (parseError) {
          console.error('Error parsing rubric for assignment:', assignment.id, parseError);
          assignment.rubric = [];
        }
      } else if (!assignment.rubric) {
        assignment.rubric = [];
      }
      return assignment;
    }) || [];

    return NextResponse.json({ assignments: parsedAssignments });
  } catch (e: any) {
    console.error('Assignments GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const data = await request.json();

    // If lesson_id is provided, fetch the course_id from the lesson
    let courseId = data.course_id ?? null;
    if (data.lesson_id && !courseId) {
      try {
        const { data: lesson, error: lessonError } = await supabase
          .from("lessons")
          .select("course_id")
          .eq("id", data.lesson_id)
          .single();

        if (!lessonError && lesson?.course_id) {
          courseId = lesson.course_id;
        }
      } catch (error) {
        console.error('Error fetching course_id from lesson:', error);
      }
    }

    const payload = {
      lesson_id: data.lesson_id ?? null,
      course_id: courseId, // Automatically set from lesson if available
      class_id: data.class_id ?? null, // Keep for backward compatibility
      title: String(data.title || "Untitled Assignment"),
      description: String(data.description || ""),
      due_date: data.due_date ?? null,
      points: Number(data.points ?? 100),
      submission_types: Array.isArray(data.submission_types) ? data.submission_types : ["file"],
      file_types_allowed: Array.isArray(data.file_types_allowed) ? data.file_types_allowed : null,
      max_file_size: Number(data.max_file_size ?? 50),
      rubric: Array.isArray(data.rubric) ? data.rubric : [],
      allow_late_submissions: Boolean(data.allow_late_submissions ?? true),
      late_penalty: data.late_penalty ?? null,
      published: Boolean(data.published ?? false),
      show_in_curriculum: Boolean(data.show_in_curriculum ?? false),
      curriculum_order: data.curriculum_order ?? null,
      creator_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: assignment, error } = await supabase
      .from("assignments")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Assignment creation error:', error);
      return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
    }

    // If assignment is associated with a lesson, add it to the lesson's content
    if (assignment.lesson_id) {
      try {
        const assignmentContentItem = {
          type: 'assignment',
          title: assignment.title,
          data: { assignmentId: assignment.id },
          id: `assignment-${assignment.id}`
        };

        // Use atomic append via Postgres to avoid read-modify-write race
        const { error: rpcError } = await supabase.rpc('append_lesson_content', {
          p_lesson_id: assignment.lesson_id,
          p_content_item: assignmentContentItem
        });

        // Fallback to read-modify-write if RPC doesn't exist
        if (rpcError && rpcError.code === '42883') {
          const { data: lesson, error: lessonError } = await supabase
            .from("lessons")
            .select("content")
            .eq("id", assignment.lesson_id)
            .single();

          if (!lessonError && lesson) {
            const currentContent = lesson.content || [];
            const assignmentExists = currentContent.some((item: any) =>
              item.type === 'assignment' && item.data?.assignmentId === assignment.id
            );

            if (!assignmentExists) {
              await supabase
                .from("lessons")
                .update({ content: [...currentContent, assignmentContentItem] })
                .eq("id", assignment.lesson_id);
            }
          }
        }
      } catch (contentError) {
        console.error('Error adding assignment to lesson content:', contentError);
        // Don't fail the assignment creation if content update fails
      }
    }

    return NextResponse.json({ id: assignment.id });
  } catch (e: any) {
    console.error('Assignment POST API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
