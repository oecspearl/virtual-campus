import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { courseUpdateSchema, validateBody } from '@/lib/validations';
import { CACHE_SHORT } from '@/lib/cache-headers';
import {
  getCourse,
  updateCourse,
  deleteCourse,
  canDeleteCourse,
  CourseNotFoundError,
  CoursePermissionError,
} from '@/lib/services/course-service';

// ─── GET — public (respects optional auth) ─────────────────────────────────

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let courseId: string | undefined;
  try {
    const { id } = await params;
    courseId = id;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const course = await getCourse(tq, id);
    return NextResponse.json(course, { headers: CACHE_SHORT });
  } catch (error) {
    if (error instanceof CourseNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    // Pre-existing "Course GET error:" line was opaque — log the course id,
    // tenant header, and the error's structured fields so intermittent 500s
    // surface actionable detail in Vercel logs instead of [object Object].
    const tenantHeader = request.headers.get('x-tenant-id');
    const tenantOverride = request.headers.get('x-tenant-override');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    console.error('Course GET error', {
      courseId,
      tenantId: tenantHeader,
      tenantOverride: tenantOverride || null,
      name: err?.name,
      message: err?.message,
      code: err?.code,
      status: err?.status,
      stack: err?.stack,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT — instructor-or-admin ──────────────────────────────────────────────

export const PUT = withTenantAuth(async ({ user, tq, request }) => {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').filter(Boolean).pop()!;

    const body = await request.json();
    const validation = validateBody(courseUpdateSchema, body);
    if (!validation.success) return validation.response;

    const updated = await updateCourse(tq, id, validation.data, {
      userId: user.id,
      userRole: user.role,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof CourseNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CoursePermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Course PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── DELETE — admin-only ────────────────────────────────────────────────────

export const DELETE = withTenantAuth(async ({ user, tq, request }) => {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').filter(Boolean).pop()!;

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    if (!canDeleteCourse(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteCourse(tq, id);
    return NextResponse.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    if (error instanceof CourseNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Course DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
