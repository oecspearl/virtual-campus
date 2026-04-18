/**
 * Assignment service — encapsulates assignment creation and its side effects
 * (appending to lesson content, creating a gradebook item).
 *
 * Routes are HTTP adapters that call these functions. Cron jobs, imports,
 * and internal callers can use them directly too.
 */

import type { TenantQuery } from '@/lib/tenant-query';
import { appendLessonContentBlock } from './lesson-content-helpers';
import { syncAssessmentToGradebook } from './gradebook-service';

export interface CreateAssignmentInput {
  lesson_id?: string | null;
  course_id?: string | null;
  class_id?: string | null;
  title?: string;
  description?: string;
  due_date?: string | null;
  points?: number;
  submission_types?: string[];
  file_types_allowed?: string[] | null;
  max_file_size?: number;
  rubric?: unknown[];
  allow_late_submissions?: boolean;
  late_penalty?: number | null;
  published?: boolean;
  show_in_curriculum?: boolean;
  curriculum_order?: number | null;
}

export interface CreateAssignmentResult {
  id: string;
  /** Whether the assignment was appended to a lesson's content array */
  addedToLesson: boolean;
  /** Whether a gradebook item was created for the assignment */
  gradebookSynced: boolean;
}

export class AssignmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssignmentValidationError';
  }
}

/**
 * Create an assignment with all its side effects:
 *   1. Insert the assignment row.
 *   2. If attached to a lesson, append an assignment content block.
 *   3. If the lesson has a course, create a gradebook item using the
 *      assignment's configured point value (default 100).
 *
 * Side-effect failures are logged but do not fail the assignment creation.
 */
export async function createAssignmentWithSideEffects(
  tq: TenantQuery,
  input: CreateAssignmentInput,
  creatorId: string
): Promise<CreateAssignmentResult> {
  // 1. Resolve course_id from supplied value or lesson.
  const courseId = await resolveCourseId(tq, input);

  // 2. Build the payload and insert.
  const payload = buildAssignmentPayload(input, courseId, creatorId);
  const { data: assignment, error } = await tq
    .from('assignments')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create assignment: ${error.message}`);
  }

  // 3. Run side effects (best effort — don't fail the assignment creation).
  let addedToLesson = false;
  let gradebookSynced = false;

  if (assignment.lesson_id) {
    addedToLesson = await appendLessonContentBlock(tq, assignment.lesson_id, {
      type: 'assignment',
      title: assignment.title,
      id: `assignment-${assignment.id}`,
      data: { assignmentId: assignment.id },
    }).catch((e) => {
      console.error('Error adding assignment to lesson content:', e);
      return false;
    });

    gradebookSynced = await syncAssignmentGradebook(tq, assignment).catch((e) => {
      console.error('Error creating gradebook item for assignment:', e);
      return false;
    });
  }

  return { id: assignment.id, addedToLesson, gradebookSynced };
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function resolveCourseId(
  tq: TenantQuery,
  input: CreateAssignmentInput
): Promise<string | null> {
  if (input.course_id) return input.course_id;
  if (!input.lesson_id) return null;

  const { data: lesson } = await tq
    .from('lessons')
    .select('course_id')
    .eq('id', input.lesson_id)
    .single();

  return lesson?.course_id ?? null;
}

function buildAssignmentPayload(
  input: CreateAssignmentInput,
  courseId: string | null,
  creatorId: string
) {
  return {
    lesson_id: input.lesson_id ?? null,
    course_id: courseId,
    class_id: input.class_id ?? null, // kept for backward compatibility
    title: String(input.title || 'Untitled Assignment'),
    description: String(input.description || ''),
    due_date: input.due_date ?? null,
    points: Number(input.points ?? 100),
    submission_types: Array.isArray(input.submission_types) ? input.submission_types : ['file'],
    file_types_allowed: Array.isArray(input.file_types_allowed) ? input.file_types_allowed : null,
    max_file_size: Number(input.max_file_size ?? 50),
    rubric: Array.isArray(input.rubric) ? input.rubric : [],
    allow_late_submissions: Boolean(input.allow_late_submissions ?? true),
    late_penalty: input.late_penalty ?? null,
    published: Boolean(input.published ?? false),
    show_in_curriculum: Boolean(input.show_in_curriculum ?? false),
    curriculum_order: input.curriculum_order ?? null,
    creator_id: creatorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

interface AssignmentRow {
  id: string;
  lesson_id: string | null;
  course_id: string | null;
  title: string;
  points: number | null;
  due_date: string | null;
}

/**
 * Create a gradebook item for an assignment. Assignments don't have "question
 * points" to sum, so we use the assignment's configured points (or 100).
 * This closes the parity gap with quiz creation, which previously synced to
 * the gradebook while assignment creation did not.
 */
async function syncAssignmentGradebook(
  tq: TenantQuery,
  assignment: AssignmentRow
): Promise<boolean> {
  if (!assignment.lesson_id) return false;

  const { data: lesson } = await tq
    .from('lessons')
    .select('course_id')
    .eq('id', assignment.lesson_id)
    .single();

  if (!lesson?.course_id) return false;

  const result = await syncAssessmentToGradebook(tq, {
    courseId: lesson.course_id,
    assessmentId: assignment.id,
    type: 'assignment',
    title: assignment.title,
    dueDate: assignment.due_date,
    points: assignment.points && assignment.points > 0 ? assignment.points : 100,
  });

  return result.synced || result.alreadyExists;
}
