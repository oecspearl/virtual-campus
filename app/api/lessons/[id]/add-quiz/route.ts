import { NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) return createAuthResponse("Forbidden", 403);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { quizId } = await request.json();

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    // Get the quiz details
    const { data: quiz, error: quizError } = await tq.from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify the quiz belongs to this lesson
    if (quiz.lesson_id !== lessonId) {
      return NextResponse.json({ error: "Quiz does not belong to this lesson" }, { status: 400 });
    }

    // Get current lesson content
    const { data: lesson, error: lessonError } = await tq.from("lessons")
      .select("content")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Check if quiz already exists in content
    const currentContent = lesson.content || [];
    const quizExists = currentContent.some((item: any) => 
      item.type === 'quiz' && item.data?.quizId === quizId
    );

    if (quizExists) {
      return NextResponse.json({ error: "Quiz already exists in lesson content" }, { status: 400 });
    }

    // Create quiz content item
    const quizContentItem = {
      type: 'quiz',
      title: quiz.title,
      data: {
        quizId: quiz.id,
        description: quiz.description || '',
        points: quiz.points || 100,
        timeLimit: quiz.time_limit,
        attemptsAllowed: quiz.attempts_allowed || 1
      },
      id: `quiz-${quiz.id}`
    };

    // Add quiz to content array
    const updatedContent = [...currentContent, quizContentItem];

    // Update lesson content
    const { error: updateError } = await tq.from("lessons")
      .update({ 
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq("id", lessonId);

    if (updateError) {
      console.error('Failed to update lesson content:', updateError);
      return NextResponse.json({ error: "Failed to add quiz to lesson content" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Quiz added to lesson content successfully",
      quizId: quiz.id,
      lessonId: lessonId
    });

  } catch (e: any) {
    console.error('Add quiz to lesson content API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
