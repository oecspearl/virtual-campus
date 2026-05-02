import type { TenantQuery } from '@/lib/tenant-query';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import type { LessonRow, LessonConceptRow } from './lesson-mapper';
import type { CourseAssemblyResponse, LessonForLlm } from './types';
import type { Provider } from './llm-service';

// All database I/O for the Personalised Course Builder lives here.
// Three groups: gate checks (tenant flag, rate limit), reads (lessons,
// concepts), writes (drafts, audit).
//
// Every read query enforces the 3-way access predicate spelled out in
// migration 044:
//
//   tenant.personalised_courses_enabled = true        ← gate, checked once
//   AND course.allow_lesson_personalisation = true    ← join filter
//   AND course.published = true                       ← join filter
//   AND lesson.published = true                       ← row filter
//   AND course.tenant_id = lesson.tenant_id           ← TenantQuery handles
//
// The tenant flag itself is checked separately (the tenants table doesn't
// carry a tenant_id column, so it can't go through TenantQuery).

const RATE_LIMIT_PER_HOUR = 10;
const AVAILABLE_LESSON_CAP = 200;

const LESSON_SELECT = `
  id, course_id, title, description, learning_outcomes,
  estimated_time, difficulty, content_type, prerequisite_lesson_id,
  course:courses!inner(id, published, allow_lesson_personalisation)
`;

// ── Gate checks ─────────────────────────────────────────────────────────────

/**
 * Reads tenant.personalised_courses_enabled. Uses the raw service client
 * because the tenants table is not tenant-scoped.
 *
 * Returns false (not throws) for missing rows so the caller can return 404
 * uniformly — we never want to leak which case (disabled vs nonexistent)
 * the requester hit.
 */
export async function isFeatureEnabledForTenant(
  tq: TenantQuery,
  tenantId: string,
): Promise<boolean> {
  const { data } = await tq.raw
    .from('tenants')
    .select('personalised_courses_enabled')
    .eq('id', tenantId)
    .maybeSingle();
  return data?.personalised_courses_enabled === true;
}

/**
 * Counts personalisation requests this learner has made in the last hour.
 * Returns true if they're under the cap. The audit table doubles as the
 * rate-limit data source — see migration 045's design notes.
 */
export async function isUnderRateLimit(
  tq: TenantQuery,
  learnerId: string,
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await tq
    .from('personalised_course_requests')
    .select('id', { count: 'exact', head: true })
    .eq('learner_id', learnerId)
    .gte('created_at', oneHourAgo);
  return (count ?? 0) < RATE_LIMIT_PER_HOUR;
}

// ── Reads ───────────────────────────────────────────────────────────────────

/**
 * The set of concept slugs the LLM is allowed to reference. Global table,
 * no tenant scope.
 */
export async function fetchConceptVocabulary(tq: TenantQuery): Promise<string[]> {
  const { data } = await tq.raw.from('concepts').select('slug');
  return ((data ?? []) as { slug: string }[]).map((row) => row.slug);
}

function stripCourseField(
  rows: Array<LessonRow & { course?: unknown }>,
): LessonRow[] {
  return rows.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { course, ...rest } = row;
    return rest as LessonRow;
  });
}

/**
 * Loads the lesson rows the learner explicitly selected, applying the full
 * 3-way access filter (course opted-in, course published, lesson published).
 * Returns ONLY the rows that pass — the caller compares the returned count
 * to the requested count to detect attempts to select ineligible lessons.
 */
export async function fetchSelectedLessons(
  tq: TenantQuery,
  lessonIds: string[],
): Promise<LessonRow[]> {
  if (lessonIds.length === 0) return [];

  const { data } = await tq
    .from('lessons')
    .select(LESSON_SELECT)
    .in('id', lessonIds)
    .eq('published', true)
    .eq('course.published', true)
    .eq('course.allow_lesson_personalisation', true);

  return stripCourseField((data ?? []) as Array<LessonRow & { course?: unknown }>);
}

/**
 * Builds the catalogue of additional lessons the LLM may draw from when
 * recommending gap-fillers. Same 3-way filter, excludes the already-selected
 * ids, capped at AVAILABLE_LESSON_CAP per spec §5.2.
 *
 * Phase 4 uses a simple "lessons in the same courses as the selection" hint
 * for relevance, then pads up to the cap with other eligible lessons. A more
 * sophisticated concept-overlap relevance score is left for a future pass —
 * the cap is the cost guardrail; relevance is an optimisation.
 */
export async function fetchAvailableLessons(
  tq: TenantQuery,
  excludeLessonIds: string[],
  selectedCourseIds: string[],
): Promise<LessonRow[]> {
  // First pass: lessons from the same courses as the selection (relevance).
  const sameCourse: LessonRow[] = [];
  if (selectedCourseIds.length > 0) {
    let q = tq
      .from('lessons')
      .select(LESSON_SELECT)
      .in('course_id', selectedCourseIds)
      .eq('published', true)
      .eq('course.published', true)
      .eq('course.allow_lesson_personalisation', true)
      .order('created_at', { ascending: false })
      .limit(AVAILABLE_LESSON_CAP);
    if (excludeLessonIds.length > 0) {
      q = q.not('id', 'in', `(${excludeLessonIds.join(',')})`);
    }
    const { data } = await q;
    sameCourse.push(
      ...stripCourseField((data ?? []) as Array<LessonRow & { course?: unknown }>),
    );
  }

  if (sameCourse.length >= AVAILABLE_LESSON_CAP) {
    return sameCourse.slice(0, AVAILABLE_LESSON_CAP);
  }

  // Second pass: pad with any other eligible lessons up to the cap.
  const seen = new Set([...excludeLessonIds, ...sameCourse.map((l) => l.id)]);
  let q = tq
    .from('lessons')
    .select(LESSON_SELECT)
    .eq('published', true)
    .eq('course.published', true)
    .eq('course.allow_lesson_personalisation', true)
    .order('created_at', { ascending: false })
    .limit(AVAILABLE_LESSON_CAP);
  if (seen.size > 0) {
    q = q.not('id', 'in', `(${Array.from(seen).join(',')})`);
  }
  const { data } = await q;
  const padded = stripCourseField(
    (data ?? []) as Array<LessonRow & { course?: unknown }>,
  );

  return [...sameCourse, ...padded].slice(0, AVAILABLE_LESSON_CAP);
}

/**
 * Loads concept tags for a list of lessons. Returns an empty array when
 * there are no tags — the mapper degrades gracefully.
 */
export async function fetchLessonConcepts(
  tq: TenantQuery,
  lessonIds: string[],
): Promise<LessonConceptRow[]> {
  if (lessonIds.length === 0) return [];
  const { data } = await tq
    .from('lesson_concepts')
    .select('lesson_id, relation, concepts(slug)')
    .in('lesson_id', lessonIds);
  return (data ?? []) as LessonConceptRow[];
}

// ── Writes ─────────────────────────────────────────────────────────────────

export interface PersistDraftInput {
  learnerId: string;
  learnerGoal: string;
  selectedLessons: LessonForLlm[];
  /**
   * The full available-lessons catalogue passed to the LLM, used here to
   * resolve title snapshots for recommended additions (which the LLM
   * references by id but we want to display by name).
   */
  availableLessons: LessonForLlm[];
  llmResponse: CourseAssemblyResponse;
  provider: Provider;
  model: string;
  promptVersion: string;
}

/**
 * Persists a successful LLM response as a draft personalised course.
 *
 * Three rows write here in sequence: the parent course, the sequence items,
 * the audit row. supabase-js doesn't expose multi-statement transactions —
 * we accept that on a partial failure mid-sequence the parent course exists
 * with no children. The route's catch handler logs it; the learner sees a
 * "saved as draft, try again" path which lets them retry idempotently.
 */
export async function persistDraft(
  tq: TenantQuery,
  input: PersistDraftInput,
  metrics: {
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
  },
): Promise<{ id: string }> {
  // 1. Parent row
  const { data: course, error: courseErr } = await tq
    .from('personalised_courses')
    .insert({
      learner_id: input.learnerId,
      learner_goal: input.learnerGoal,
      status: 'draft',
      generated_syllabus: input.llmResponse.generatedSyllabus,
      inferred_objectives: input.llmResponse.inferredObjectives,
      flagged_gaps: input.llmResponse.flaggedGaps,
      flagged_conflicts: input.llmResponse.flaggedConflicts,
      llm_provider: input.provider,
      llm_model: input.model,
      prompt_version: input.promptVersion,
    })
    .select('id')
    .single();

  if (courseErr || !course) {
    throw new Error(`Failed to insert personalised_courses: ${courseErr?.message}`);
  }
  const personalisedCourseId = course.id as string;

  // 2. Sequence items: selected lessons in their assembled order, plus
  //    recommended additions. Title snapshots come from the in-memory
  //    catalogue so we don't re-fetch.
  const titleByLessonId = new Map<string, string>();
  for (const l of input.selectedLessons) titleByLessonId.set(l.id, l.title);
  for (const l of input.availableLessons) titleByLessonId.set(l.id, l.title);

  const sequenceRows = input.llmResponse.generatedSequence.map((item) => ({
    personalised_course_id: personalisedCourseId,
    lesson_id: item.lessonId,
    lesson_title_snapshot: titleByLessonId.get(item.lessonId) ?? 'Selected lesson',
    position: item.position,
    item_type: 'selected' as const,
    rationale: item.rationale,
    insert_after_position: null,
    accepted: true,
  }));
  const recommendationRows = input.llmResponse.recommendedAdditions.map((rec) => ({
    personalised_course_id: personalisedCourseId,
    lesson_id: rec.lessonId,
    lesson_title_snapshot: titleByLessonId.get(rec.lessonId) ?? 'Recommended addition',
    position: 0, // overridden on accept (see /approve handler)
    item_type: 'recommended' as const,
    rationale: rec.reason,
    insert_after_position: rec.insertAfterPosition,
    accepted: null, // pending learner review
  }));

  if (sequenceRows.length + recommendationRows.length > 0) {
    const { error: itemsErr } = await tq
      .from('personalised_course_lessons')
      .insert([...sequenceRows, ...recommendationRows]);
    if (itemsErr) {
      throw new Error(
        `Failed to insert personalised_course_lessons: ${itemsErr.message}`,
      );
    }
  }

  // 3. Audit row
  await tq.from('personalised_course_requests').insert({
    learner_id: input.learnerId,
    personalised_course_id: personalisedCourseId,
    selected_lesson_count: input.selectedLessons.length,
    available_lesson_count: input.availableLessons.length,
    llm_provider: input.provider,
    llm_model: input.model,
    prompt_version: input.promptVersion,
    latency_ms: metrics.latencyMs,
    prompt_tokens: metrics.promptTokens ?? null,
    completion_tokens: metrics.completionTokens ?? null,
    outcome: 'success',
  });

  return { id: personalisedCourseId };
}

/**
 * The LLM-unavailable case. Persists the goal + selection as a stub draft so
 * the learner can retry without re-picking, and writes an audit row marking
 * the failure mode.
 */
export async function persistFailedDraft(
  tq: TenantQuery,
  input: {
    learnerId: string;
    learnerGoal: string;
    selectedLessons: LessonForLlm[];
    errorMessage: string;
  },
): Promise<{ id: string }> {
  const { data: course, error } = await tq
    .from('personalised_courses')
    .insert({
      learner_id: input.learnerId,
      learner_goal: input.learnerGoal,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !course) {
    throw new Error(`Failed to insert stub personalised_courses: ${error?.message}`);
  }
  const personalisedCourseId = course.id as string;

  if (input.selectedLessons.length > 0) {
    await tq.from('personalised_course_lessons').insert(
      input.selectedLessons.map((l, idx) => ({
        personalised_course_id: personalisedCourseId,
        lesson_id: l.id,
        lesson_title_snapshot: l.title,
        position: idx,
        item_type: 'selected',
        accepted: true,
      })),
    );
  }

  await tq.from('personalised_course_requests').insert({
    learner_id: input.learnerId,
    personalised_course_id: personalisedCourseId,
    selected_lesson_count: input.selectedLessons.length,
    outcome: 'failed_unavailable',
    error_message: input.errorMessage,
  });

  return { id: personalisedCourseId };
}

/**
 * Inserts a `rate_limited` audit row. Rate-limit denials are logged so they
 * show up in cost/abuse dashboards, not just silently 429-ed.
 */
export async function logRateLimitDenial(
  tq: TenantQuery,
  learnerId: string,
  selectedLessonCount: number,
): Promise<void> {
  await tq.from('personalised_course_requests').insert({
    learner_id: learnerId,
    selected_lesson_count: selectedLessonCount,
    outcome: 'rate_limited',
  });
}

// ── Approval / draft load ──────────────────────────────────────────────────

export interface DraftRow {
  id: string;
  learner_id: string;
  status: 'draft' | 'active' | 'archived';
  approved_at: string | null;
}

/**
 * Loads the bare draft row for ownership checks before mutations.
 */
export async function fetchDraft(
  tq: TenantQuery,
  id: string,
): Promise<DraftRow | null> {
  const { data } = await tq
    .from('personalised_courses')
    .select('id, learner_id, status, approved_at')
    .eq('id', id)
    .maybeSingle();
  return (data as DraftRow | null) ?? null;
}

// ── Cross-cutting access check ─────────────────────────────────────────────

/**
 * True when `lessonId` appears in an APPROVED personalised course owned by
 * `userId` AND the learner accepted that item. Used by requireCourseAccess()
 * in lib/enrollment-check.ts to grant lesson-read access without enrolling
 * the student in the parent course.
 *
 * Predicate: status='active' AND learner_id=userId AND lesson_id=lessonId
 *            AND accepted=true.
 *
 *   * accepted=true covers selected items (always true at insert) and
 *     accepted recommendations (flipped on approve).
 *   * accepted=false covers rejected recommendations — no access.
 *   * accepted=null only happens on draft rows; status filter excludes them.
 *
 * Uses the raw service client because this helper is called from outside
 * any tenant context (the lesson API is tenant-scoped to the LESSON's
 * tenant, but the personalised path lives in the LEARNER's tenant — the
 * two are the same in single-tenant mode but defending here would require
 * threading tenantId through requireCourseAccess, which isn't worth it
 * for a single boolean check).
 */
export async function hasActivePathAccessToLesson(
  userId: string,
  lessonId: string,
): Promise<boolean> {
  if (!userId || !lessonId) return false;
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('personalised_course_lessons')
    .select('id, personalised_courses!inner(learner_id, status)')
    .eq('lesson_id', lessonId)
    .eq('accepted', true)
    .eq('personalised_courses.learner_id', userId)
    .eq('personalised_courses.status', 'active')
    .limit(1);
  return !!(data && data.length > 0);
}

// ── Reads for the UI ───────────────────────────────────────────────────────

export interface PersonalisedCourseSummary {
  id: string;
  learner_goal: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  approved_at: string | null;
}

/**
 * List view: a learner's own personalised courses, newest first.
 */
export async function fetchPersonalisedCoursesForLearner(
  tq: TenantQuery,
  learnerId: string,
): Promise<PersonalisedCourseSummary[]> {
  const { data } = await tq
    .from('personalised_courses')
    .select('id, learner_goal, status, created_at, approved_at')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });
  return (data ?? []) as PersonalisedCourseSummary[];
}

export interface PersonalisedCourseDetail {
  id: string;
  learner_id: string;
  learner_goal: string;
  status: 'draft' | 'active' | 'archived';
  generated_syllabus: string | null;
  inferred_objectives: string[];
  flagged_gaps: string[];
  flagged_conflicts: string[];
  llm_provider: string | null;
  llm_model: string | null;
  created_at: string;
  approved_at: string | null;
  items: Array<{
    id: string;
    lesson_id: string | null;
    /** Parent course_id of the lesson, surfaced from a join. Null when the
     *  lesson has been deleted (lesson_id is also null in that case). */
    course_id: string | null;
    lesson_title_snapshot: string;
    position: number;
    item_type: 'selected' | 'recommended';
    rationale: string | null;
    insert_after_position: number | null;
    accepted: boolean | null;
  }>;
}

/**
 * Detail view used by the preview/active page. Returns null if the course
 * doesn't exist or isn't owned by the learner — caller treats both as 404.
 */
export async function fetchPersonalisedCourseDetail(
  tq: TenantQuery,
  id: string,
  learnerId: string,
): Promise<PersonalisedCourseDetail | null> {
  const { data: course } = await tq
    .from('personalised_courses')
    .select(
      'id, learner_id, learner_goal, status, generated_syllabus, inferred_objectives, flagged_gaps, flagged_conflicts, llm_provider, llm_model, created_at, approved_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!course || (course as { learner_id: string }).learner_id !== learnerId) {
    return null;
  }
  const { data: items } = await tq
    .from('personalised_course_lessons')
    .select(
      'id, lesson_id, lesson_title_snapshot, position, item_type, rationale, insert_after_position, accepted, lesson:lessons(course_id)',
    )
    .eq('personalised_course_id', id)
    .order('position', { ascending: true });

  // Flatten the joined lesson.course_id onto each item. The relation can
  // come back as an object (single FK) or null (lesson was deleted).
  type RawItem = Omit<PersonalisedCourseDetail['items'][number], 'course_id'> & {
    lesson?: { course_id: string | null } | null;
  };
  const flattened: PersonalisedCourseDetail['items'] = ((items ?? []) as RawItem[]).map(
    ({ lesson, ...rest }) => ({
      ...rest,
      course_id: lesson?.course_id ?? null,
    }),
  );

  return {
    ...(course as Omit<PersonalisedCourseDetail, 'items'>),
    items: flattened,
  };
}

export interface CatalogueLesson {
  id: string;
  title: string;
  description: string | null;
  difficulty: number | null;
  estimated_time: number | null;
  content_type: string | null;
  course_id: string | null;
  course_title: string | null;
}

/**
 * Catalogue listing for the build screen. Same 3-way filter as
 * fetchAvailableLessons, paginated, with optional text search and course
 * filter. Returned shape is UI-friendly (course title joined in).
 */
export async function fetchCatalogue(
  tq: TenantQuery,
  opts: {
    search?: string;
    courseId?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ lessons: CatalogueLesson[]; total: number; courses: { id: string; title: string }[] }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  let q = tq
    .from('lessons')
    .select(
      `
        id, title, description, difficulty, estimated_time, content_type, course_id,
        course:courses!inner(id, title, published, allow_lesson_personalisation)
      `,
      { count: 'exact' },
    )
    .eq('published', true)
    .eq('course.published', true)
    .eq('course.allow_lesson_personalisation', true)
    .order('title', { ascending: true })
    .range(offset, offset + limit - 1);

  if (opts.search && opts.search.trim().length > 0) {
    // ilike is case-insensitive; escape the user input by passing a literal.
    q = q.ilike('title', `%${opts.search.trim()}%`);
  }
  if (opts.courseId) {
    q = q.eq('course_id', opts.courseId);
  }

  const { data, count } = await q;
  type Joined = CatalogueLesson & {
    course?: { id: string; title: string } | { id: string; title: string }[] | null;
  };
  const lessons: CatalogueLesson[] = ((data ?? []) as Joined[]).map((row) => {
    const c = Array.isArray(row.course) ? row.course[0] : row.course;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { course: _course, ...rest } = row;
    return { ...rest, course_title: c?.title ?? null } as CatalogueLesson;
  });

  // Distinct course list for the filter dropdown. Cheap because the
  // partial index on courses.allow_lesson_personalisation only contains
  // opted-in rows.
  const { data: courseRows } = await tq
    .from('courses')
    .select('id, title')
    .eq('published', true)
    .eq('allow_lesson_personalisation', true)
    .order('title', { ascending: true });

  return {
    lessons,
    total: count ?? lessons.length,
    courses: ((courseRows ?? []) as { id: string; title: string }[]),
  };
}

/**
 * Approves a draft: applies recommendation accept/reject decisions, sets
 * status to 'active', stamps approved_at. Caller is responsible for the
 * ownership check (we'd otherwise let any tenant member flip any draft).
 */
export async function approveDraft(
  tq: TenantQuery,
  id: string,
  acceptedRecommendationIds: string[],
  rejectedRecommendationIds: string[],
): Promise<void> {
  if (acceptedRecommendationIds.length > 0) {
    await tq
      .from('personalised_course_lessons')
      .update({ accepted: true })
      .eq('personalised_course_id', id)
      .in('id', acceptedRecommendationIds);
  }
  if (rejectedRecommendationIds.length > 0) {
    await tq
      .from('personalised_course_lessons')
      .update({ accepted: false })
      .eq('personalised_course_id', id)
      .in('id', rejectedRecommendationIds);
  }
  await tq
    .from('personalised_courses')
    .update({ status: 'active', approved_at: new Date().toISOString() })
    .eq('id', id);
}
