import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { validateBody } from '@/lib/validations';
import {
  isFeatureEnabledForTenant,
  fetchPersonalisedCourseDetail,
  fetchDraft,
  updatePersonalisedCourse,
  deletePersonalisedCourse,
} from '@/lib/personalised-courses/repository';

// All routes return 404 for missing rows, rows owned by another learner,
// and tenants without the feature — uniform 404 keeps any of those cases
// from being distinguishable from outside.

function pathIdFromUrl(url: string): string | null {
  // /api/courses/personalise/[id] — id is the last segment.
  const id = new URL(url).pathname.split('/').filter(Boolean).pop();
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

const updateRequestSchema = z
  .object({
    courseTitle: z.string().trim().min(1).max(500).nullable().optional(),
    learnerGoal: z.string().trim().min(10).max(500).optional(),
  })
  .refine(
    (v) => v.courseTitle !== undefined || v.learnerGoal !== undefined,
    { message: 'Provide at least one field to update.' },
  );

export const GET = withTenantAuth(async ({ user, tq, tenantId, request }) => {
  if (!(await isFeatureEnabledForTenant(tq, tenantId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const id = pathIdFromUrl(request.url);
  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const course = await fetchPersonalisedCourseDetail(tq, id, user.id);
  if (!course) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(course);
});

export const PATCH = withTenantAuth(async ({ user, tq, tenantId, request }) => {
  if (!(await isFeatureEnabledForTenant(tq, tenantId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const id = pathIdFromUrl(request.url);
  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const validation = validateBody(updateRequestSchema, body);
  if (!validation.success) return validation.response;
  const { courseTitle, learnerGoal } = validation.data;

  const draft = await fetchDraft(tq, id);
  if (!draft || draft.learner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await updatePersonalisedCourse(tq, id, {
    ...(courseTitle !== undefined ? { course_title: courseTitle } : {}),
    ...(learnerGoal !== undefined ? { learner_goal: learnerGoal } : {}),
  });

  return NextResponse.json({ id, status: draft.status });
});

export const DELETE = withTenantAuth(async ({ user, tq, tenantId, request }) => {
  if (!(await isFeatureEnabledForTenant(tq, tenantId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const id = pathIdFromUrl(request.url);
  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const draft = await fetchDraft(tq, id);
  if (!draft || draft.learner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await deletePersonalisedCourse(tq, id);
  return NextResponse.json({ id, deleted: true });
});
