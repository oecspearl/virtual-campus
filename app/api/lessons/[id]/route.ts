import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { requireCourseAccess } from '@/lib/enrollment-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isAdmin = (role: string) => hasRole(role, ['admin', 'super_admin']);

const INSTRUCTOR_ROLES = ['instructor', 'curriculum_designer', 'admin', 'super_admin'] as const;

/**
 * Check whether the user is allowed to mutate this lesson.
 * Rules:
 *  1. Admins can always edit.
 *  2. If the lesson is locked, only admins can edit.
 *  3. Section-specific lessons (class_id) require section instructor assignment.
 *  4. Shared lessons (class_id IS NULL) allow any course instructor.
 */
async function canMutateLesson(
  userId: string,
  userRole: string,
  lesson: { class_id: string | null; course_id: string; locked: boolean },
  tenantId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (isAdmin(userRole)) return { allowed: true };

  if (lesson.locked) {
    return {
      allowed: false,
      reason: 'This lesson is locked. Only administrators can modify locked content.',
    };
  }

  if (lesson.class_id) {
    const serviceSupabase = createServiceSupabaseClient();

    const { data: ci } = await serviceSupabase
      .from('class_instructors')
      .select('id')
      .eq('class_id', lesson.class_id)
      .eq('instructor_id', userId)
      .limit(1);
    if (ci && ci.length > 0) return { allowed: true };

    const { data: cf } = await serviceSupabase
      .from('cohort_facilitators')
      .select('id')
      .eq('cohort_id', lesson.class_id)
      .eq('user_id', userId)
      .limit(1);
    if (cf && cf.length > 0) return { allowed: true };

    return {
      allowed: false,
      reason: 'You can only edit content in sections you are assigned to.',
    };
  }

  const tq = createTenantQuery(tenantId);
  const { data: courseInstructor } = await tq
    .from('course_instructors')
    .select('id')
    .eq('course_id', lesson.course_id)
    .eq('instructor_id', userId)
    .limit(1);

  if (courseInstructor && courseInstructor.length > 0) return { allowed: true };

  return { allowed: false, reason: 'You are not an instructor for this course.' };
}

// ---------------------------------------------------------------------------
// GET — allows unauthenticated read of published lessons, so stays on the
// inline pattern. Auth is optional here; withTenantAuth would reject guests.
// ---------------------------------------------------------------------------

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const authResult = await authenticateUser(request as any);
    const user = authResult.success ? authResult.userProfile! : null;
    const isStaff = user && hasRole(user.role, INSTRUCTOR_ROLES);

    const { data: lesson, error } = await tq.from('lessons').select('*').eq('id', id).single();

    if (error) {
      console.error('Lesson fetch error:', error);
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (!isStaff && lesson && !lesson.published) {
      return NextResponse.json({ error: 'This lesson is not yet published' }, { status: 403 });
    }

    // Enrollment / public-course gate: a student or unauthenticated visitor
    // can only read this lesson if (a) the parent course is is_public, or
    // (b) they are actively enrolled. Staff are exempted by the helper.
    if (lesson?.course_id) {
      const access = await requireCourseAccess(user, lesson.course_id);
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: access.status });
      }
    }

    return NextResponse.json(lesson);
  } catch (e: any) {
    console.error('Lesson GET API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT — full update
// ---------------------------------------------------------------------------

export const PUT = withTenantAuth(
  async ({ user, tq, tenantId, request }) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').filter(Boolean).pop()!;
      const body = await request.json();

      const { data: existing, error: fetchErr } = await tq
        .from('lessons')
        .select('id, course_id, class_id, locked')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }

      const authCheck = await canMutateLesson(user.id, user.role, existing, tenantId);
      if (!authCheck.allowed) {
        return NextResponse.json({ error: authCheck.reason }, { status: 403 });
      }

      const validContentTypes = ['rich_text', 'video', 'scorm', 'quiz', 'assignment'];
      const updateData: Record<string, unknown> = {
        title: String(body.title || ''),
        description: String(body.description || ''),
        content_type: validContentTypes.includes(body.content_type) ? body.content_type : 'rich_text',
        difficulty: Number(body.difficulty ?? 1),
        learning_outcomes: Array.isArray(body.learning_outcomes) ? body.learning_outcomes : [],
        lesson_instructions: String(body.lesson_instructions || ''),
        content: Array.isArray(body.content) ? body.content : [],
        resources: Array.isArray(body.resources) ? body.resources : [],
        estimated_time: Number(body.estimated_time ?? 0),
        published: Boolean(body.published ?? false),
        updated_at: new Date().toISOString(),
      };

      if (body.section_id !== undefined) updateData.section_id = body.section_id || null;
      if (body.class_id !== undefined && isAdmin(user.role)) {
        updateData.class_id = body.class_id || null;
      }

      const { data: lesson, error } = await tq
        .from('lessons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Lesson update error:', error);
        return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
      }

      return NextResponse.json(lesson);
    } catch (e: any) {
      console.error('Lesson PUT API error:', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { requiredRoles: INSTRUCTOR_ROLES }
);

// ---------------------------------------------------------------------------
// PATCH — partial update (section, order, publish, lock)
// ---------------------------------------------------------------------------

export const PATCH = withTenantAuth(
  async ({ user, tq, tenantId, request }) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').filter(Boolean).pop()!;
      const body = await request.json();

      const { data: existing, error: fetchErr } = await tq
        .from('lessons')
        .select('id, course_id, class_id, locked')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }

      // Lock/unlock is admin-only and bypasses the normal mutation check
      if (body.locked !== undefined) {
        if (!isAdmin(user.role)) {
          return NextResponse.json(
            { error: 'Only administrators can lock or unlock content.' },
            { status: 403 }
          );
        }

        const lockData = {
          locked: Boolean(body.locked),
          locked_by: body.locked ? user.id : null,
          locked_at: body.locked ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        };

        const { data: lesson, error } = await tq
          .from('lessons')
          .update(lockData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Lesson lock error:', error);
          return NextResponse.json({ error: 'Failed to update lock status' }, { status: 500 });
        }

        return NextResponse.json(lesson);
      }

      const authCheck = await canMutateLesson(user.id, user.role, existing, tenantId);
      if (!authCheck.allowed) {
        return NextResponse.json({ error: authCheck.reason }, { status: 403 });
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.section_id !== undefined) updateData.section_id = body.section_id || null;
      if (body.order !== undefined) updateData.order = body.order;
      if (body.published !== undefined) updateData.published = body.published;
      if (body.class_id !== undefined && isAdmin(user.role)) {
        updateData.class_id = body.class_id || null;
      }

      const { data: lesson, error } = await tq
        .from('lessons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Lesson PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
      }

      return NextResponse.json(lesson);
    } catch (e: any) {
      console.error('Lesson PATCH API error:', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { requiredRoles: INSTRUCTOR_ROLES }
);

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export const DELETE = withTenantAuth(
  async ({ user, tq, tenantId, request }) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').filter(Boolean).pop()!;

      const { data: existing, error: fetchErr } = await tq
        .from('lessons')
        .select('id, course_id, class_id, locked')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }

      const authCheck = await canMutateLesson(user.id, user.role, existing, tenantId);
      if (!authCheck.allowed) {
        return NextResponse.json({ error: authCheck.reason }, { status: 403 });
      }

      const { error } = await tq.from('lessons').delete().eq('id', id);

      if (error) {
        console.error('Lesson delete error:', error);
        return NextResponse.json({ error: 'Failed to delete lesson' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('Lesson DELETE API error:', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { requiredRoles: INSTRUCTOR_ROLES }
);
