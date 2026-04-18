import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { createQuizWithSideEffects, QuizValidationError } from '@/lib/services/quiz-service';

export const GET = withTenantAuth(async ({ tq, request }) => {
  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get('lesson_id');
  const courseId = searchParams.get('course_id');
  const published = searchParams.get('published');

  let query = tq.from('quizzes').select('*');

  if (lessonId) query = query.eq('lesson_id', lessonId);
  if (courseId) query = query.eq('course_id', courseId);
  if (published !== null) query = query.eq('published', published === 'true');

  query = query.order('created_at', { ascending: false });

  const { data: quizzes, error } = await query.limit(100);

  if (error) {
    console.error('[Quizzes API] Quiz fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }

  const validQuizzes = (quizzes || []).filter((quiz: { id?: string }) => quiz && quiz.id);
  return NextResponse.json({ quizzes: validQuizzes });
});

export const POST = withTenantAuth(
  async ({ user, tq, request }) => {
    try {
      const input = await request.json();
      const result = await createQuizWithSideEffects(tq, input, user.id);
      return NextResponse.json({ id: result.id });
    } catch (error) {
      if (error instanceof QuizValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error('Quiz creation error:', error);
      return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }
  },
  { requiredRoles: ['instructor', 'curriculum_designer', 'admin', 'super_admin'] as const }
);
