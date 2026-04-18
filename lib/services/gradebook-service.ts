/**
 * Gradebook service — a single place that creates `course_grade_items`
 * rows. Called from quiz-service, assignment-service, and any future
 * assessment type that should appear in the gradebook.
 */

import type { TenantQuery } from '@/lib/tenant-query';

export type AssessmentType = 'quiz' | 'assignment';

const DEFAULT_CATEGORY: Record<AssessmentType, string> = {
  quiz: 'Quizzes',
  assignment: 'Assignments',
};

export interface GradebookSyncInput {
  courseId: string;
  /** The id of the quiz/assignment row this grade item corresponds to. */
  assessmentId: string;
  type: AssessmentType;
  title: string;
  dueDate?: string | null;
  /**
   * The points to record. Callers compute this themselves (e.g. quiz-service
   * sums question points) so this function stays transport/domain-agnostic.
   * Must be a positive number.
   */
  points: number;
  /** Defaults to "Quizzes" or "Assignments" based on `type`. */
  category?: string;
  /** Defaults to 1.0. */
  weight?: number;
}

export interface GradebookSyncResult {
  synced: boolean;
  alreadyExists: boolean;
}

/**
 * Idempotently create a gradebook item for an assessment.
 * Returns `{ synced: false, alreadyExists: true }` when a row already exists
 * for the given (course, type, assessment) triple.
 */
export async function syncAssessmentToGradebook(
  tq: TenantQuery,
  input: GradebookSyncInput
): Promise<GradebookSyncResult> {
  if (!input.courseId || !input.assessmentId) {
    throw new Error('courseId and assessmentId are required');
  }
  if (!Number.isFinite(input.points) || input.points <= 0) {
    throw new Error('points must be a positive number');
  }

  const { data: existing } = await tq
    .from('course_grade_items')
    .select('id')
    .eq('course_id', input.courseId)
    .eq('type', input.type)
    .eq('assessment_id', input.assessmentId)
    .single();

  if (existing) return { synced: false, alreadyExists: true };

  const now = new Date().toISOString();
  const { error } = await tq.from('course_grade_items').insert([
    {
      course_id: input.courseId,
      title: input.title,
      type: input.type,
      category: input.category ?? DEFAULT_CATEGORY[input.type],
      points: input.points,
      assessment_id: input.assessmentId,
      due_date: input.dueDate ?? null,
      weight: input.weight ?? 1.0,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]);

  if (error) {
    throw new Error(`Failed to create gradebook item: ${error.message}`);
  }

  return { synced: true, alreadyExists: false };
}
