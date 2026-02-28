import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// PUT: Toggle content item completion
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

    if (user.id !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { content_index, content_type, content_title, content_id, completed, metadata } = body;

    if (content_index === undefined || content_index < 0) {
      return NextResponse.json({ error: "content_index is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    const now = new Date().toISOString();
    const progressData = {
      student_id: studentId,
      lesson_id: lessonId,
      content_index,
      content_type: content_type || 'unknown',
      content_title: content_title || null,
      content_id: content_id || null,
      completed: completed ?? true,
      completed_at: completed ? now : null,
      metadata: metadata || {},
      updated_at: now
    };

    const { data: progress, error } = await serviceSupabase
      .from('content_item_progress')
      .upsert([progressData], { onConflict: 'student_id,lesson_id,content_index' })
      .select()
      .single();

    if (error) {
      console.error('Error updating content progress:', error);
      return NextResponse.json({ error: "Failed to update content progress" }, { status: 500 });
    }

    // Also update lesson progress to 'in_progress' if not already completed
    const { data: lessonProgress } = await serviceSupabase
      .from('lesson_progress')
      .select('status')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .single();

    if (!lessonProgress || lessonProgress.status === 'not_started') {
      await serviceSupabase
        .from('lesson_progress')
        .upsert([{
          student_id: studentId,
          lesson_id: lessonId,
          status: 'in_progress',
          started_at: now,
          last_accessed_at: now,
          updated_at: now
        }], { onConflict: 'student_id,lesson_id' });
    }

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Content progress PUT error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Get all content item progress for a lesson
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

    if (user.id !== studentId) {
      const isAdmin = ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(user.role);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const serviceSupabase = createServiceSupabaseClient();

    const { data: contentProgress, error } = await serviceSupabase
      .from('content_item_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .order('content_index', { ascending: true });

    if (error) {
      console.error('Error fetching content progress:', error);
      return NextResponse.json({ error: "Failed to fetch content progress" }, { status: 500 });
    }

    return NextResponse.json(contentProgress || []);

  } catch (error) {
    console.error('Content progress GET error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
