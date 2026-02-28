import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET: Fetch lesson progress including content item progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; lessonId: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const { studentId, lessonId } = await params;

    const serviceSupabase = createServiceSupabaseClient();

    // Check permissions - students can only view their own progress
    if (user.id !== studentId) {
      const isAdmin = ['admin', 'super_admin'].includes(user.role);
      const isStaff = ['instructor', 'curriculum_designer'].includes(user.role);

      if (!isAdmin && !isStaff) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Instructors must have a teaching relationship to the student's course
      if (isStaff && !isAdmin) {
        const { data: lesson } = await serviceSupabase
          .from('lessons')
          .select('module_id, modules!inner(course_id)')
          .eq('id', lessonId)
          .single();

        if (lesson) {
          const courseId = (lesson as any).modules?.course_id;
          if (courseId) {
            const { data: relationship } = await serviceSupabase
              .from('course_instructors')
              .select('id')
              .eq('course_id', courseId)
              .eq('instructor_id', user.id)
              .single();

            if (!relationship) {
              return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
          }
        }
      }
    }

    // Get lesson progress
    const { data: lessonProgress } = await serviceSupabase
      .from('lesson_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .single();

    // Get content item progress
    const { data: contentProgress } = await serviceSupabase
      .from('content_item_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .order('content_index', { ascending: true });

    return NextResponse.json({
      lesson: lessonProgress || { status: 'not_started' },
      content_items: contentProgress || []
    });

  } catch (error) {
    console.error('Lesson progress GET error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Update lesson completion status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; lessonId: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const { studentId, lessonId } = await params;

    // Only allow users to update their own progress
    if (user.id !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, progress_percentage } = body;

    const serviceSupabase = createServiceSupabaseClient();

    // Verify lesson exists
    const { data: lesson, error: lessonError } = await serviceSupabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Build progress data
    const now = new Date().toISOString();
    const progressData: Record<string, unknown> = {
      student_id: studentId,
      lesson_id: lessonId,
      status: status || 'in_progress',
      updated_at: now,
      last_accessed_at: now
    };

    // Set completion timestamp if completing
    if (status === 'completed' || progress_percentage === 100) {
      progressData.completed_at = now;
      progressData.status = 'completed';
    }

    // Upsert progress record
    const { data: progress, error: progressError } = await serviceSupabase
      .from('lesson_progress')
      .upsert([progressData], { onConflict: 'student_id,lesson_id' })
      .select()
      .single();

    if (progressError) {
      console.error('Error updating progress:', progressError);
      return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
    }

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Lesson progress PUT error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
