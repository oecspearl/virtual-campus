import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// Helper function to check if user is instructor for a course
async function checkCourseInstructor(supabase: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await supabase
    .from("course_instructors")
    .select("id")
    .eq("course_id", courseId)
    .eq("instructor_id", userId)
    .single();

  return !!data;
}

// Helper function to get course_id from lesson_id
async function getCourseIdFromLesson(supabase: any, lessonId: string): Promise<string | null> {
  const { data } = await supabase
    .from("lessons")
    .select("course_id")
    .eq("id", lessonId)
    .single();

  return data?.course_id || null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(_request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const supabase = await createServerSupabaseClient();
    
    const { data: assignment, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      console.error('Assignment fetch error:', error);
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    
    // Parse rubric if stored as JSON string
    if (assignment.rubric && typeof assignment.rubric === 'string') {
      try { assignment.rubric = JSON.parse(assignment.rubric); } catch { assignment.rubric = []; }
    }

    return NextResponse.json(assignment);
  } catch (e: any) {
    console.error('Assignment GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) return createAuthResponse("Forbidden", 403);

    const data = await request.json();
    const supabase = await createServerSupabaseClient();
    
    // Check if user can edit this assignment (creator, course instructor, or admin)
    const { data: existingAssignment, error: fetchError } = await supabase
      .from("assignments")
      .select("creator_id, lesson_id, course_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingAssignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Get course_id from lesson if not directly set
    let courseId = existingAssignment.course_id;
    if (!courseId && existingAssignment.lesson_id) {
      courseId = await getCourseIdFromLesson(supabase, existingAssignment.lesson_id);
    }

    // Check authorization: creator, course instructor, or admin
    const isCreator = existingAssignment.creator_id === user.id;
    const isAdmin = hasRole(user.role, ["admin", "super_admin"]);
    const isCourseInstructor = courseId ? await checkCourseInstructor(supabase, user.id, courseId) : false;

    if (!isCreator && !isAdmin && !isCourseInstructor) {
      return NextResponse.json({ error: "You don't have permission to edit this assignment" }, { status: 403 });
    }
    
    const updateData = {
      lesson_id: data.lesson_id ?? null,
      course_id: data.course_id ?? courseId ?? null,
      class_id: data.class_id ?? null,
      title: String(data.title || ""),
      description: String(data.description || ""),
      due_date: data.due_date ?? null,
      points: Number(data.points ?? 100),
      submission_types: Array.isArray(data.submission_types) ? data.submission_types : ["file"],
      file_types_allowed: Array.isArray(data.file_types_allowed) ? data.file_types_allowed : null,
      max_file_size: Number(data.max_file_size ?? 50),
      rubric: Array.isArray(data.rubric) ? data.rubric : [],
      allow_late_submissions: Boolean(data.allow_late_submissions ?? true),
      late_penalty: data.late_penalty ?? null,
      anonymous_grading: Boolean(data.anonymous_grading ?? false),
      peer_review_enabled: Boolean(data.peer_review_enabled ?? false),
      peer_reviews_required: Number(data.peer_reviews_required ?? 2),
      peer_review_due_date: data.peer_review_due_date ?? null,
      peer_review_anonymous: Boolean(data.peer_review_anonymous ?? true),
      is_group_assignment: Boolean(data.is_group_assignment ?? false),
      group_set_id: data.group_set_id ?? null,
      one_submission_per_group: Boolean(data.one_submission_per_group ?? true),
      published: Boolean(data.published ?? false),
      updated_at: new Date().toISOString()
    };
    
    const { data: assignment, error } = await supabase
      .from("assignments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      console.error('Assignment update error:', error);
      return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
    }
    
    // Sync with gradebook if assignment is associated with a course
    const syncCourseId = assignment.course_id || (assignment.lesson_id ? await getCourseIdFromLesson(supabase, assignment.lesson_id) : null);
    if (syncCourseId) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/courses/${syncCourseId}/gradebook/quiz-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: id,
            assessmentType: 'assignment',
            action: 'updated'
          })
        });
      } catch (syncError) {
        console.error('Gradebook sync error:', syncError);
        // Don't fail the assignment update if sync fails
      }
    }
    
    return NextResponse.json(assignment);
  } catch (e: any) {
    console.error('Assignment PUT API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(_request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) return createAuthResponse("Forbidden", 403);

    const supabase = await createServerSupabaseClient();

    // Check if user can delete this assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("creator_id, lesson_id, course_id")
      .eq("id", id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Get course_id from lesson if not directly set
    let courseId = assignment.course_id;
    if (!courseId && assignment.lesson_id) {
      courseId = await getCourseIdFromLesson(supabase, assignment.lesson_id);
    }

    // Check authorization: creator, course instructor, or admin
    const isCreator = assignment.creator_id === user.id;
    const isAdmin = hasRole(user.role, ["admin", "super_admin"]);
    const isCourseInstructor = courseId ? await checkCourseInstructor(supabase, user.id, courseId) : false;

    if (!isCreator && !isAdmin && !isCourseInstructor) {
      return NextResponse.json({ error: "You don't have permission to delete this assignment" }, { status: 403 });
    }

    // Get assignment data before deletion for sync
    const { data: assignmentToDelete } = await supabase
      .from("assignments")
      .select("lesson_id")
      .eq("id", id)
      .single();

    // Clean up gradebook items and student grades associated with this assignment
    // Use service client to bypass RLS
    const serviceSupabase = createServiceSupabaseClient();
    const { data: gradeItems } = await serviceSupabase
      .from("course_grade_items")
      .select("id")
      .eq("type", "assignment")
      .eq("assessment_id", id);

    if (gradeItems && gradeItems.length > 0) {
      const gradeItemIds = gradeItems.map(item => item.id);

      // Delete student grades for these grade items first (due to foreign key constraint)
      const { error: gradesDeleteError } = await serviceSupabase
        .from("course_grades")
        .delete()
        .in("grade_item_id", gradeItemIds);

      if (gradesDeleteError) {
        console.error('Error deleting student grades for assignment:', gradesDeleteError);
      }

      // Delete the grade items
      const { error: itemsDeleteError } = await serviceSupabase
        .from("course_grade_items")
        .delete()
        .in("id", gradeItemIds);

      if (itemsDeleteError) {
        console.error('Error deleting grade items for assignment:', itemsDeleteError);
      }

      console.log(`Cleaned up ${gradeItemIds.length} grade items for deleted assignment ${id}`);
    }

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error('Assignment delete error:', error);
      return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
    }

    // Remove assignment from lesson content if it was associated with a lesson
    if (assignmentToDelete?.lesson_id) {
      try {
        // Get the current lesson content
        const { data: lesson, error: lessonError } = await supabase
          .from("lessons")
          .select("content")
          .eq("id", assignmentToDelete.lesson_id)
          .single();

        if (!lessonError && lesson) {
          const currentContent = lesson.content || [];
          
          // Remove assignment from lesson content
          const newContent = currentContent.filter((item: any) => 
            !(item.type === 'assignment' && item.data?.assignmentId === id)
          );

          // Update the lesson with the filtered content
          await supabase
            .from("lessons")
            .update({ content: newContent })
            .eq("id", assignmentToDelete.lesson_id);
        }
      } catch (contentError) {
        console.error('Error removing assignment from lesson content:', contentError);
        // Don't fail the assignment deletion if content update fails
      }
    }
    
    // Sync with gradebook if assignment was associated with a course
    if (assignmentToDelete?.lesson_id) {
      try {
        // Get the course_id from the lesson
        const { data: lesson } = await supabase
          .from("lessons")
          .select("course_id")
          .eq("id", assignmentToDelete.lesson_id)
          .single();
        
        if (lesson?.course_id) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/courses/${lesson.course_id}/gradebook/quiz-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assessmentId: id,
              assessmentType: 'assignment',
              action: 'deleted'
            })
          });
        }
      } catch (syncError) {
        console.error('Gradebook sync error:', syncError);
        // Don't fail the assignment deletion if sync fails
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Assignment DELETE API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
