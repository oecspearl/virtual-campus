import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { validateBody } from '@/lib/validations';
import { LLMService } from '@/lib/personalised-courses/llm-service';
import { LLMUnavailableError } from '@/lib/personalised-courses/types';
import { mapLessonsForLlm } from '@/lib/personalised-courses/lesson-mapper';
import {
  isFeatureEnabledForTenant,
  isUnderRateLimit,
  fetchConceptVocabulary,
  fetchSelectedLessons,
  fetchAvailableLessons,
  fetchLessonConcepts,
  persistDraft,
  persistFailedDraft,
  logRateLimitDenial,
  fetchPersonalisedCoursesForLearner,
} from '@/lib/personalised-courses/repository';

// AI generation can take 30–45s end-to-end; default Vercel function timeout
// (300s) is plenty, but the AI route convention in this repo sets maxDuration
// explicitly. Keep it generous to allow the fallback ladder to complete.
export const maxDuration = 90;

const personaliseRequestSchema = z.object({
  learnerGoal: z.string().trim().min(10).max(500),
  selectedLessonIds: z
    .array(z.string().uuid())
    .min(3, 'Select at least 3 lessons.')
    .max(30, 'Select at most 30 lessons.')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Duplicate lesson ids in selection.',
    ),
});

export const GET = withTenantAuth(async ({ user, tq, tenantId }) => {
  if (!(await isFeatureEnabledForTenant(tq, tenantId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const courses = await fetchPersonalisedCoursesForLearner(tq, user.id);
  return NextResponse.json({ courses });
});

export const POST = withTenantAuth(async ({ user, tq, tenantId, request }) => {
  // 1. Tenant feature gate. Returns 404 (not 403) so we don't leak feature
  //    existence to tenants who haven't opted in.
  if (!(await isFeatureEnabledForTenant(tq, tenantId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 2. Body validation.
  const body = await request.json().catch(() => null);
  const validation = validateBody(personaliseRequestSchema, body);
  if (!validation.success) return validation.response;
  const { learnerGoal, selectedLessonIds } = validation.data;

  // 3. Rate limit. Log the denial as an audit row so abuse shows up in
  //    cost/audit dashboards, not just silently in 429 responses.
  if (!(await isUnderRateLimit(tq, user.id))) {
    await logRateLimitDenial(tq, user.id, selectedLessonIds.length);
    return NextResponse.json(
      {
        error: 'RATE_LIMITED',
        message: 'You have reached the per-hour limit on personalisation requests. Please try again later.',
      },
      { status: 429 },
    );
  }

  // 4. Resolve the selected lessons under the 3-way access predicate.
  //    Any id that doesn't satisfy the predicate is silently dropped by the
  //    query; we detect it by count mismatch and return 404 with the spec's
  //    learner-facing message.
  const selectedRows = await fetchSelectedLessons(tq, selectedLessonIds);
  if (selectedRows.length !== selectedLessonIds.length) {
    return NextResponse.json(
      { error: 'One or more selected lessons could not be found.' },
      { status: 404 },
    );
  }

  // 5. Build the LLM-shaped request.
  const selectedCourseIds = Array.from(
    new Set(selectedRows.map((r) => r.course_id).filter((id): id is string => !!id)),
  );
  const availableRows = await fetchAvailableLessons(
    tq,
    selectedLessonIds,
    selectedCourseIds,
  );

  const allLessonIds = [
    ...selectedRows.map((r) => r.id),
    ...availableRows.map((r) => r.id),
  ];
  const conceptRows = await fetchLessonConcepts(tq, allLessonIds);
  const conceptTaxonomy = await fetchConceptVocabulary(tq);

  const selectedLessons = mapLessonsForLlm({
    lessons: selectedRows,
    lessonConcepts: conceptRows.filter((c) =>
      selectedRows.some((r) => r.id === c.lesson_id),
    ),
  });
  const availableLessons = mapLessonsForLlm({
    lessons: availableRows,
    lessonConcepts: conceptRows.filter((c) =>
      availableRows.some((r) => r.id === c.lesson_id),
    ),
  });

  // 6. Call the LLM service. Internal primary→fallback ladder is invisible
  //    to us; we just observe `fallbackUsed` and `provider` on the result.
  const svc = new LLMService();
  const startedAt = Date.now();
  let result: Awaited<ReturnType<typeof svc.assembleCourse>>;
  try {
    result = await svc.assembleCourse({
      learnerGoal,
      selectedLessons,
      availableLessons,
      conceptTaxonomy,
    });
  } catch (err) {
    if (err instanceof LLMUnavailableError) {
      // 503 path: persist the goal + selection so the learner can retry
      // without re-picking, then return the draft id.
      const stub = await persistFailedDraft(tq, {
        learnerId: user.id,
        learnerGoal,
        selectedLessons,
        errorMessage: err.message,
      });
      return NextResponse.json(
        {
          error: 'LLM_UNAVAILABLE',
          message:
            'Course assembly is temporarily unavailable. Your selection has been saved — please try again shortly.',
          draftId: stub.id,
        },
        { status: 503 },
      );
    }
    // Anything else is genuinely unexpected. Log and 500.
    console.error('Personalisation assembly error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
  const latencyMs = Date.now() - startedAt;

  // 7. Defensive sanity check: every lessonId the LLM emits must come from
  //    the input pool. The Zod schema doesn't enforce this — it can't know
  //    which ids were valid. If the LLM hallucinates an id, treat it as a
  //    malformed response and 502.
  const inputIds = new Set([
    ...selectedLessons.map((l) => l.id),
    ...availableLessons.map((l) => l.id),
  ]);
  const allOutputIds = [
    ...result.response.generatedSequence.map((s) => s.lessonId),
    ...result.response.recommendedAdditions.map((r) => r.lessonId),
  ];
  const hallucinated = allOutputIds.find((id) => !inputIds.has(id));
  if (hallucinated) {
    console.error('LLM emitted unknown lesson id', {
      provider: result.provider,
      model: result.model,
      hallucinated,
    });
    return NextResponse.json(
      {
        error: 'MALFORMED_RESPONSE',
        message: 'We had trouble assembling your course. Please try again.',
      },
      { status: 502 },
    );
  }

  // 8. Persist + return the draft.
  const persisted = await persistDraft(
    tq,
    {
      learnerId: user.id,
      learnerGoal,
      selectedLessons,
      availableLessons,
      llmResponse: result.response,
      provider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
    },
    {
      latencyMs,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      fallbackUsed: result.fallbackUsed,
    },
  );

  return NextResponse.json({
    id: persisted.id,
    status: 'draft',
    learnerGoal,
    generatedSequence: result.response.generatedSequence,
    recommendedAdditions: result.response.recommendedAdditions,
    flaggedGaps: result.response.flaggedGaps,
    flaggedConflicts: result.response.flaggedConflicts,
    generatedSyllabus: result.response.generatedSyllabus,
    inferredObjectives: result.response.inferredObjectives,
    llmProvider: result.provider,
    llmModel: result.model,
  });
});
