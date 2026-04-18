import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import {
  createAssignmentWithSideEffects,
  AssignmentValidationError,
} from '@/lib/services/assignment-service';

export const GET = withTenantAuth(async ({ tq, request }) => {
  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get('lesson_id');
  const courseId = searchParams.get('course_id');
  const published = searchParams.get('published');

  let query = tq.from('assignments').select('*');

  if (lessonId) query = query.eq('lesson_id', lessonId);
  if (published !== null) query = query.eq('published', published === 'true');

  // For course_id filter: also include assignments linked via lesson_id
  if (courseId) {
    const { data: courseLessons } = await tq
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    const lessonIds = (courseLessons || []).map((l: { id: string }) => l.id);

    if (lessonIds.length > 0) {
      query = query.or(`course_id.eq.${courseId},lesson_id.in.(${lessonIds.join(',')})`);
    } else {
      query = query.eq('course_id', courseId);
    }
  }

  const { data: assignments, error } = await query
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Assignments fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }

  // Parse rubric JSON strings back to arrays.
  const parsed = (assignments || []).map((assignment: any) => {
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
  });

  return NextResponse.json({ assignments: parsed });
});

export const POST = withTenantAuth(
  async ({ user, tq, request }) => {
    try {
      const input = await request.json();
      const result = await createAssignmentWithSideEffects(tq, input, user.id);
      return NextResponse.json({ id: result.id });
    } catch (error) {
      if (error instanceof AssignmentValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error('Assignment creation error:', error);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }
  },
  { requiredRoles: ['instructor', 'curriculum_designer', 'admin', 'super_admin'] as const }
);
