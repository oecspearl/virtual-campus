/**
 * Quiz service — encapsulates quiz creation and the side effects that go
 * with it (appending to lesson content, creating a gradebook item).
 *
 * Routes are HTTP adapters that call these functions. Cron jobs, imports,
 * and other internal callers can use them directly too.
 */

import type { TenantQuery } from '@/lib/tenant-query';

// ─── Types ──────────────────────────────────────────────────────────────────

type ProctoredMode = 'none' | 'basic' | 'strict';

export interface CreateQuizInput {
  lesson_id?: string | null;
  course_id?: string | null;
  title?: string;
  description?: string;
  instructions?: string;
  time_limit?: number | null;
  attempts_allowed?: number;
  show_correct_answers?: boolean;
  show_feedback?: string;
  randomize_questions?: boolean;
  randomize_answers?: boolean;
  passing_score?: number | null;
  due_date?: string | null;
  available_from?: string | null;
  available_until?: string | null;
  points?: number;
  published?: boolean;
  proctored_mode?: ProctoredMode | boolean;
  proctor_settings?: Record<string, unknown> | null;
  show_in_curriculum?: boolean;
  curriculum_order?: number | null;
}

export interface CreateQuizResult {
  id: string;
  /** Whether the quiz was appended to a lesson's content array */
  addedToLesson: boolean;
  /** Whether a gradebook item was created for the quiz */
  gradebookSynced: boolean;
}

// ─── Core operation ─────────────────────────────────────────────────────────

/**
 * Create a quiz with all its side effects:
 *   1. Insert the quiz row.
 *   2. If attached to a lesson, append a quiz content block to that lesson
 *      (using the `append_lesson_content` RPC, with a read-modify-write fallback).
 *   3. If the lesson has a course, create a gradebook item for the quiz,
 *      using the sum of question points when available.
 *
 * Side-effect failures are logged but do not fail the quiz creation itself.
 */
export async function createQuizWithSideEffects(
  tq: TenantQuery,
  input: CreateQuizInput,
  creatorId: string
): Promise<CreateQuizResult> {
  // 1. Resolve course_id — either supplied directly, or derived from lesson.
  const courseId = await resolveCourseId(tq, input);
  if (!courseId) {
    throw new QuizValidationError(
      'Course is required. Please select a course or provide a lesson that belongs to a course.'
    );
  }

  // 2. Build the payload and insert.
  const payload = buildQuizPayload(input, courseId, creatorId);
  const { data: quiz, error } = await tq.from('quizzes').insert([payload]).select().single();

  if (error) {
    throw new Error(`Failed to create quiz: ${error.message}`);
  }

  // 3. Run side effects (best effort — don't fail the quiz creation).
  let addedToLesson = false;
  let gradebookSynced = false;

  if (quiz.lesson_id) {
    addedToLesson = await appendQuizToLesson(tq, quiz).catch((e) => {
      console.error('Error adding quiz to lesson content:', e);
      return false;
    });

    gradebookSynced = await syncQuizToGradebook(tq, quiz).catch((e) => {
      console.error('Error creating gradebook item for quiz:', e);
      return false;
    });
  }

  return { id: quiz.id, addedToLesson, gradebookSynced };
}

export class QuizValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuizValidationError';
  }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function resolveCourseId(tq: TenantQuery, input: CreateQuizInput): Promise<string | null> {
  if (input.course_id) return input.course_id;
  if (!input.lesson_id) return null;

  const { data: lesson, error } = await tq
    .from('lessons')
    .select('course_id')
    .eq('id', input.lesson_id)
    .single();

  if (error || !lesson) return null;
  return lesson.course_id ?? null;
}

function buildQuizPayload(input: CreateQuizInput, courseId: string, creatorId: string) {
  const proctoredModeValue: ProctoredMode = (() => {
    if (input.proctored_mode === true) return 'basic';
    if (typeof input.proctored_mode === 'string' && ['none', 'basic', 'strict'].includes(input.proctored_mode)) {
      return input.proctored_mode;
    }
    return 'none';
  })();

  const hasProctoring = proctoredModeValue !== 'none';

  return {
    lesson_id: input.lesson_id ?? null,
    course_id: courseId,
    title: String(input.title || 'Untitled Quiz'),
    description: String(input.description || ''),
    instructions: String(input.instructions || ''),
    time_limit: input.time_limit ?? null,
    attempts_allowed: Number(input.attempts_allowed ?? 1),
    show_correct_answers: Boolean(input.show_correct_answers),
    show_feedback: String(input.show_feedback ?? 'after_submit'),
    randomize_questions: Boolean(input.randomize_questions),
    randomize_answers: Boolean(input.randomize_answers),
    passing_score: input.passing_score ?? null,
    due_date: input.due_date ?? null,
    available_from: input.available_from ?? null,
    available_until: input.available_until ?? null,
    points: Number(input.points ?? 0),
    published: Boolean(input.published),
    proctored_mode: proctoredModeValue,
    proctor_settings: hasProctoring ? (input.proctor_settings ?? null) : null,
    show_in_curriculum: Boolean(input.show_in_curriculum),
    curriculum_order: input.curriculum_order ?? null,
    creator_id: creatorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

interface QuizRow {
  id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  points: number | null;
  time_limit: number | null;
  attempts_allowed: number | null;
  due_date: string | null;
}

/**
 * Append a quiz content block to the lesson's content array. Uses an atomic
 * Postgres RPC when available, falls back to read-modify-write otherwise.
 */
async function appendQuizToLesson(tq: TenantQuery, quiz: QuizRow): Promise<boolean> {
  if (!quiz.lesson_id) return false;

  const contentItem = {
    type: 'quiz',
    title: quiz.title,
    data: {
      quizId: quiz.id,
      description: quiz.description || '',
      points: quiz.points || 100,
      timeLimit: quiz.time_limit,
      attemptsAllowed: quiz.attempts_allowed || 1,
    },
    id: `quiz-${quiz.id}`,
  };

  const { error: rpcError } = await tq.raw.rpc('append_lesson_content', {
    p_lesson_id: quiz.lesson_id,
    p_content_item: contentItem,
  });

  if (!rpcError) return true;

  // Fallback when RPC doesn't exist (Postgres error 42883 = undefined function)
  if (rpcError.code !== '42883') {
    throw new Error(`RPC failed: ${rpcError.message}`);
  }

  const { data: lesson } = await tq
    .from('lessons')
    .select('content, course_id')
    .eq('id', quiz.lesson_id)
    .single();

  if (!lesson) return false;

  const currentContent = lesson.content || [];
  const alreadyExists = currentContent.some((item: { id?: string }) => item.id === `quiz-${quiz.id}`);

  if (alreadyExists) return true;

  await tq
    .from('lessons')
    .update({ content: [...currentContent, contentItem], updated_at: new Date().toISOString() })
    .eq('id', quiz.lesson_id);

  return true;
}

/**
 * Create a `course_grade_items` row so the quiz shows up in the gradebook.
 * Idempotent — skips if an item already exists for this quiz.
 * Point total is computed from question points when available, falling back
 * to the quiz's configured points (or 100).
 */
async function syncQuizToGradebook(tq: TenantQuery, quiz: QuizRow): Promise<boolean> {
  if (!quiz.lesson_id) return false;

  const { data: lesson } = await tq
    .from('lessons')
    .select('course_id')
    .eq('id', quiz.lesson_id)
    .single();

  if (!lesson?.course_id) return false;

  const { data: existingGradeItem } = await tq
    .from('course_grade_items')
    .select('id')
    .eq('course_id', lesson.course_id)
    .eq('type', 'quiz')
    .eq('assessment_id', quiz.id)
    .single();

  if (existingGradeItem) return true;

  const { data: questions } = await tq
    .from('questions')
    .select('points')
    .eq('quiz_id', quiz.id);

  const totalFromQuestions = (questions || []).reduce(
    (sum: number, q: { points?: number | null }) => sum + Number(q.points ?? 0),
    0
  );
  const pointsToUse = totalFromQuestions > 0 ? totalFromQuestions : (quiz.points || 100);

  const { error } = await tq.from('course_grade_items').insert([
    {
      course_id: lesson.course_id,
      title: quiz.title,
      type: 'quiz',
      category: 'Quizzes',
      points: pointsToUse,
      assessment_id: quiz.id,
      due_date: quiz.due_date,
      weight: 1.0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    throw new Error(`Failed to create gradebook item: ${error.message}`);
  }

  return true;
}
