import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { hasRole } from '@/lib/rbac';
import {
  createAssignmentWithSideEffects,
  AssignmentValidationError,
} from '@/lib/services/assignment-service';

export const GET = withTenantAuth(async ({ user, tq, request }) => {
  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get('lesson_id');
  const courseId = searchParams.get('course_id');
  const published = searchParams.get('published');

  // Column set sized for the assignments list / course-nav consumers.
  // Dropping rubric + peer_review_rubric (both JSONB) is the big win —
  // those are only needed by the edit / grade screens, which use the
  // single-assignment /api/assignments/[id] route.
  const ASSIGNMENT_LIST_COLUMNS =
    'id, lesson_id, course_id, title, description, due_date, points, published, curriculum_order, created_at';

  let query = tq.from('assignments').select(ASSIGNMENT_LIST_COLUMNS);

  if (lessonId) query = query.eq('lesson_id', lessonId);
  if (published !== null) query = query.eq('published', published === 'true');

  // Defense in depth: students/parents must never see draft assignments,
  // regardless of which surface called this endpoint. The course assignments
  // list also filters in the UI, but the API is the source of truth.
  const isStaff = hasRole(user.role, [
    'instructor',
    'curriculum_designer',
    'admin',
    'super_admin',
  ]);
  if (!isStaff) {
    query = query.eq('published', true);
  }

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
    .order('curriculum_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Assignments fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }

  return NextResponse.json({ assignments: assignments || [] });
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
