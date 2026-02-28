import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; courseId: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const { studentId, courseId } = await params;

    const serviceSupabase = createServiceSupabaseClient();

    // Check if user is accessing their own progress or has appropriate privileges
    if (user.id !== studentId) {
      const isAdmin = ['admin', 'super_admin'].includes(user.role);
      if (!isAdmin) {
        // For instructors/curriculum_designers, verify they teach this course
        if (['instructor', 'curriculum_designer'].includes(user.role)) {
          const { data: instructorCheck } = await serviceSupabase
            .from('course_instructors')
            .select('id')
            .eq('course_id', courseId)
            .eq('instructor_id', user.id)
            .single();
          if (!instructorCheck) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // Get course lessons by course_id
    const { data: lessons, error: lessonsError } = await serviceSupabase
      .from('lessons')
      .select('id, title, order, published')
      .eq('course_id', courseId)
      .eq('published', true)
      .order('order', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json({ error: "Failed to fetch course lessons" }, { status: 500 });
    }

    if (!lessons || lessons.length === 0) {
      return NextResponse.json({
        total: 0,
        completed: 0,
        percentage: 0,
        lessons: []
      });
    }

    // Get user's lesson progress
    const { data: progressRecords, error: progressError } = await serviceSupabase
      .from('lesson_progress')
      .select('lesson_id, completed_at, status')
      .eq('student_id', studentId)
      .in('lesson_id', lessons.map(l => l.id));

    if (progressError) {
      console.error('Error fetching progress records:', progressError);
      return NextResponse.json({ error: "Failed to fetch progress records" }, { status: 500 });
    }

    // Calculate progress
    const total = lessons.length;
    const completed = progressRecords?.filter(p => p.status === 'completed' || p.completed_at).length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Create detailed progress for each lesson
    const lessonProgress = lessons.map(lesson => {
      const progress = progressRecords?.find(p => p.lesson_id === lesson.id);
      return {
        lesson_id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        completed: !!(progress?.status === 'completed' || progress?.completed_at),
        completed_at: progress?.completed_at || null,
        status: progress?.status || 'not_started'
      };
    });

    return NextResponse.json({
      total,
      completed,
      percentage,
      lessons: lessonProgress
    });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; courseId: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const { studentId, courseId } = await params;

    // Check if user is updating their own progress
    if (user.id !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { lesson_id, status, completed_at } = body;

    if (!lesson_id) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Check if lesson exists (skip course validation for now)
    const { data: lesson, error: lessonError } = await serviceSupabase
      .from('lessons')
      .select('id')
      .eq('id', lesson_id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Upsert progress record
    const { data: progress, error: progressError } = await serviceSupabase
      .from('lesson_progress')
      .upsert([{
        student_id: studentId,
        lesson_id: lesson_id,
        status: status || 'completed',
        completed_at: completed_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'student_id,lesson_id'
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error updating progress:', progressError);
      return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
    }

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Progress update API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}