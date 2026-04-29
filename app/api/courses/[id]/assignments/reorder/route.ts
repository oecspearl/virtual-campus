import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';

// PUT /api/courses/[id]/assignments/reorder
// Body: { orders: [{ id: string, order: number }, ...] }
// Persists `curriculum_order` on each assignment.
//
// Allowed roles: admin, super_admin, curriculum_designer, instructor.
// (Lesson reorder excludes instructor; this endpoint includes them by design
// — instructors should be able to reorder their own course's assignment list.)
export const PUT = withTenantAuth(
  async ({ tq, request }) => {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split('/').filter(Boolean);
      // /api/courses/[id]/assignments/reorder → courseId is segment after "courses"
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

      // Validate scope: every id must belong to this course (directly via
      // course_id, or indirectly via a lesson under this course). Without
      // this check, a caller could reorder assignments in another course.
      const { data: courseLessons } = await tq
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

      const lessonIds = (courseLessons || []).map((l: { id: string }) => l.id);

      const { data: existing, error: fetchErr } = await tq
        .from('assignments')
        .select('id, course_id, lesson_id')
        .in('id', ids);

      if (fetchErr) {
        console.error('Reorder fetch error:', fetchErr);
        return NextResponse.json({ error: 'Failed to validate assignments' }, { status: 500 });
      }

      const lessonIdSet = new Set(lessonIds);
      const outOfScope = (existing || []).filter(
        (a) => a.course_id !== courseId && !(a.lesson_id && lessonIdSet.has(a.lesson_id)),
      );
      if (outOfScope.length > 0 || (existing || []).length !== ids.length) {
        return NextResponse.json(
          { error: 'One or more assignments do not belong to this course' },
          { status: 400 },
        );
      }

      const now = new Date().toISOString();
      const results = await Promise.all(
        orders.map((item: { id: string; order: number }) =>
          tq
            .from('assignments')
            .update({ curriculum_order: item.order, updated_at: now })
            .eq('id', item.id),
        ),
      );

      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        console.error('Reorder update errors:', failed.map((f) => f.error));
        return NextResponse.json(
          { error: 'Failed to update some assignment orders' },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, count: orders.length });
    } catch (error) {
      console.error('Assignment reorder error:', error);
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
