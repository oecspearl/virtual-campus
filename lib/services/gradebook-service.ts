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

// ─── Update / remove ────────────────────────────────────────────────────────
//
// These mirror the create flow above but operate on existing
// `course_grade_items` rows. They are called directly from the assignment
// and quiz route handlers when an item is edited or deleted, so the sync
// runs in-process — no fragile HTTP roundtrip to a separate auth-gated
// endpoint that silently 401s when called server-to-server.

export interface GradebookUpdateInput {
  courseId: string;
  assessmentId: string;
  type: AssessmentType;
  title: string;
  dueDate?: string | null;
  /**
   * The new max points. If provided and different from the existing item's
   * `points`, every linked `course_grades` row is rescaled: `max_score` is
   * updated and `percentage` is recomputed from the existing `score`.
   */
  points: number;
}

export interface GradebookUpdateResult {
  /** Number of `course_grade_items` rows updated. */
  itemsUpdated: number;
  /** Number of `course_grades` rows whose max_score/percentage were rescaled. */
  gradesRescaled: number;
}

/**
 * Update every gradebook item that mirrors a given assessment, plus rescale
 * any existing student grades when the max points change. Safe to call when
 * no gradebook item exists yet (returns zeros).
 */
export async function updateAssessmentInGradebook(
  tq: TenantQuery,
  input: GradebookUpdateInput,
): Promise<GradebookUpdateResult> {
  if (!input.courseId || !input.assessmentId) {
    throw new Error('courseId and assessmentId are required');
  }
  if (!Number.isFinite(input.points) || input.points <= 0) {
    throw new Error('points must be a positive number');
  }

  const { data: gradeItems, error: fetchErr } = await tq
    .from('course_grade_items')
    .select('id, points')
    .eq('course_id', input.courseId)
    .eq('type', input.type)
    .eq('assessment_id', input.assessmentId);

  if (fetchErr) {
    throw new Error(`Failed to fetch gradebook items: ${fetchErr.message}`);
  }
  if (!gradeItems || gradeItems.length === 0) {
    return { itemsUpdated: 0, gradesRescaled: 0 };
  }

  const now = new Date().toISOString();
  let itemsUpdated = 0;
  let gradesRescaled = 0;

  for (const item of gradeItems) {
    const previousPoints = Number(item.points ?? 0);

    const { error: updateErr } = await tq
      .from('course_grade_items')
      .update({
        title: input.title,
        points: input.points,
        due_date: input.dueDate ?? null,
        updated_at: now,
      })
      .eq('id', item.id);

    if (updateErr) {
      throw new Error(`Failed to update gradebook item: ${updateErr.message}`);
    }
    itemsUpdated += 1;

    if (previousPoints === input.points) continue;

    // Points changed: rescale every linked student grade so the displayed
    // max_score and percentage reflect the new total.
    const { data: existingGrades, error: gradesErr } = await tq
      .from('course_grades')
      .select('id, score')
      .eq('grade_item_id', item.id);

    if (gradesErr) {
      throw new Error(`Failed to fetch course grades: ${gradesErr.message}`);
    }
    if (!existingGrades || existingGrades.length === 0) continue;

    for (const grade of existingGrades) {
      const score = Number(grade.score ?? 0);
      const percentage = input.points > 0 ? (score / input.points) * 100 : 0;
      const { error: gradeUpdateErr } = await tq
        .from('course_grades')
        .update({
          max_score: input.points,
          percentage: Number(percentage.toFixed(2)),
          updated_at: now,
        })
        .eq('id', grade.id);

      if (gradeUpdateErr) {
        throw new Error(`Failed to update course grade: ${gradeUpdateErr.message}`);
      }
      gradesRescaled += 1;
    }
  }

  return { itemsUpdated, gradesRescaled };
}

export interface GradebookRemoveInput {
  courseId: string;
  assessmentId: string;
  type: AssessmentType;
}

export interface GradebookRemoveResult {
  itemsRemoved: number;
  gradesRemoved: number;
}

/**
 * Remove every gradebook item that mirrors a given assessment, plus all
 * student grades pointing at those items. Safe to call when nothing exists
 * (returns zeros).
 */
export async function removeAssessmentFromGradebook(
  tq: TenantQuery,
  input: GradebookRemoveInput,
): Promise<GradebookRemoveResult> {
  if (!input.courseId || !input.assessmentId) {
    throw new Error('courseId and assessmentId are required');
  }

  const { data: gradeItems, error: fetchErr } = await tq
    .from('course_grade_items')
    .select('id')
    .eq('course_id', input.courseId)
    .eq('type', input.type)
    .eq('assessment_id', input.assessmentId);

  if (fetchErr) {
    throw new Error(`Failed to fetch gradebook items: ${fetchErr.message}`);
  }
  if (!gradeItems || gradeItems.length === 0) {
    return { itemsRemoved: 0, gradesRemoved: 0 };
  }

  const itemIds = gradeItems.map((g) => g.id);

  // Count linked grades up-front for a useful return value, then delete.
  const { data: linkedGrades } = await tq
    .from('course_grades')
    .select('id')
    .in('grade_item_id', itemIds);
  const gradesRemoved = linkedGrades?.length ?? 0;

  // Grades have a FK to course_grade_items, so they must go first.
  const { error: gradesDelErr } = await tq
    .from('course_grades')
    .delete()
    .in('grade_item_id', itemIds);

  if (gradesDelErr) {
    throw new Error(`Failed to delete course grades: ${gradesDelErr.message}`);
  }

  const { error: itemsDelErr } = await tq
    .from('course_grade_items')
    .delete()
    .in('id', itemIds);

  if (itemsDelErr) {
    throw new Error(`Failed to delete gradebook items: ${itemsDelErr.message}`);
  }

  return { itemsRemoved: itemIds.length, gradesRemoved };
}
