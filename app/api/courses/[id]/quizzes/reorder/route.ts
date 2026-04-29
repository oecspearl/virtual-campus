import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';

// PUT /api/courses/[id]/quizzes/reorder
// Body: { orders: [{ id: string, order: number }, ...] }
// Persists `curriculum_order` on each quiz. Mirrors the assignments
// reorder endpoint so the course assignment list can save both lists
// in a single user action.
export const PUT = withTenantAuth(
  async ({ tq, request }) => {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split('/').filter(Boolean);
      const courseId = segments[segments.indexOf('courses') + 1];

      if (!courseId) {
        return NextResponse.json({ error: 'Course id missing' }, { status: 400 });
      }

      const body = await request.json();
      const orders = Array.isArray(body?.orders) ? body.orders : null;

      if (!orders || orders.length === 0) {
        return NextResponse.json(
          { error: 'orders array is required' },
          { status: 400 },
        );
      }

      const ids: string[] = [];
      for (const item of orders) {
        if (
          !item ||
          typeof item.id !== 'string' ||
          typeof item.order !== 'number' ||
          Number.isNaN(item.order)
        ) {
          return NextResponse.json(
            { error: 'Each order entry must have { id: string, order: number }' },
            { status: 400 },
          );
        }
        ids.push(item.id);
      }

      // Validate scope: every quiz must belong to this course (directly via
      // course_id, or via a lesson under this course).
      const { data: courseLessons } = await tq
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

      const lessonIds = (courseLessons || []).map((l: { id: string }) => l.id);

      const { data: existing, error: fetchErr } = await tq
        .from('quizzes')
        .select('id, course_id, lesson_id')
        .in('id', ids);

      if (fetchErr) {
        console.error('Quiz reorder fetch error:', fetchErr);
        return NextResponse.json({ error: 'Failed to validate quizzes' }, { status: 500 });
      }

      const lessonIdSet = new Set(lessonIds);
      const outOfScope = (existing || []).filter(
        (q) => q.course_id !== courseId && !(q.lesson_id && lessonIdSet.has(q.lesson_id)),
      );
      if (outOfScope.length > 0 || (existing || []).length !== ids.length) {
        return NextResponse.json(
          { error: 'One or more quizzes do not belong to this course' },
          { status: 400 },
        );
      }

      const now = new Date().toISOString();
      const results = await Promise.all(
        orders.map((item: { id: string; order: number }) =>
          tq
            .from('quizzes')
            .update({ curriculum_order: item.order, updated_at: now })
            .eq('id', item.id),
        ),
      );

      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        console.error('Quiz reorder update errors:', failed.map((f) => f.error));
        return NextResponse.json(
          { error: 'Failed to update some quiz orders' },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, count: orders.length });
    } catch (error) {
      console.error('Quiz reorder error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    requiredRoles: [
      'instructor',
      'curriculum_designer',
      'admin',
      'super_admin',
    ] as const,
  },
);
