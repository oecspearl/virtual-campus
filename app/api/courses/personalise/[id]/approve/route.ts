import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { validateBody } from '@/lib/validations';
import {
  isFeatureEnabledForTenant,
  fetchDraft,
  approveDraft,
} from '@/lib/personalised-courses/repository';

// Approval transitions a draft personalised course to status='active'. The
// learner reviews recommended additions in the preview UI and sends back the
// row ids of the recommendations they accept and reject — those flip to
// accepted=true / accepted=false here. Once approved the sequence is locked.
//
// Returns 404 (not 403) for tenants without the feature, missing drafts,
// and drafts owned by another learner — uniform 404 keeps any of those
// cases from being distinguishable from outside.

const approveRequestSchema = z.object({
  acceptedRecommendationIds: z.array(z.string().uuid()).default([]),
  rejectedRecommendationIds: z.array(z.string().uuid()).default([]),
});

export const POST = withTenantAuth(async ({ user, tq, tenantId, request }) => {
  if (!(await isFeatureEnabledForTenant(tq, tenantId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  // route is /api/courses/personalise/[id]/approve — id is the second-last segment.
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 2];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const validation = validateBody(approveRequestSchema, body);
  if (!validation.success) return validation.response;
  const { acceptedRecommendationIds, rejectedRecommendationIds } = validation.data;

  const draft = await fetchDraft(tq, id);
  if (!draft || draft.learner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (draft.status !== 'draft') {
    // Already approved / archived — idempotent-ish: tell the caller it's
    // not in a state we can transition. 409 is the conventional code.
    return NextResponse.json(
      { error: `Cannot approve a course in status="${draft.status}".` },
      { status: 409 },
    );
  }

  await approveDraft(
    tq,
    id,
    acceptedRecommendationIds,
    rejectedRecommendationIds,
  );

  return NextResponse.json({ id, status: 'active' });
});
