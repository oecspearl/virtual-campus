/**
 * Gradebook summary persistence — the bridge between the pure aggregation
 * engine (`gradebook-aggregation.ts`) and the database. One function:
 *
 *   recomputeCourseGradeSummary(tq, courseId, studentId)
 *
 * Call it after any write to `course_grades`, `course_grade_items`, or
 * `course_grade_categories` for the affected (course, student) pair.
 *
 * For bulk recomputes (e.g. instructor edits an item that affects 200
 * students), call `recomputeCourseGradeSummariesForCourse` instead — it
 * fetches the full course state once and aggregates each student in
 * memory rather than re-running 200 round-trips.
 */

import type { TenantQuery } from '@/lib/tenant-query';
import {
  computeCourseGrade,
  type GradeCategory,
  type GradeItem,
  type LetterBand,
  type StudentGrade,
} from './gradebook-aggregation';

interface CourseGradebookSnapshot {
  categories: GradeCategory[];
  items: GradeItem[];
  letterScale: LetterBand[];
}

async function loadCourseSnapshot(
  tq: TenantQuery,
  courseId: string
): Promise<CourseGradebookSnapshot> {
  const [catRes, itemRes, letterRes] = await Promise.all([
    tq
      .from('course_grade_categories')
      .select(
        'id, parent_id, name, aggregation, drop_lowest, drop_highest, keep_highest, weight, extra_credit, hidden, sort_order'
      )
      .eq('course_id', courseId),
    tq
      .from('course_grade_items')
      .select(
        'id, category_id, points, weight, extra_credit, hidden, locked'
      )
      .eq('course_id', courseId)
      .eq('is_active', true),
    tq
      .from('course_grade_letters')
      .select('letter, min_percentage')
      .eq('course_id', courseId),
  ]);

  if (catRes.error) {
    throw new Error(`Failed to load grade categories: ${catRes.error.message}`);
  }
  if (itemRes.error) {
    throw new Error(`Failed to load grade items: ${itemRes.error.message}`);
  }
  if (letterRes.error) {
    throw new Error(
      `Failed to load letter scale: ${letterRes.error.message}`
    );
  }

  return {
    categories: (catRes.data ?? []) as GradeCategory[],
    items: (itemRes.data ?? []) as GradeItem[],
    letterScale: (letterRes.data ?? []) as LetterBand[],
  };
}

async function loadStudentGrades(
  tq: TenantQuery,
  courseId: string,
  studentId: string
): Promise<StudentGrade[]> {
  const { data, error } = await tq
    .from('course_grades')
    .select('grade_item_id, score, max_score')
    .eq('course_id', courseId)
    .eq('student_id', studentId);
  if (error) {
    throw new Error(`Failed to load student grades: ${error.message}`);
  }
  return (data ?? []) as StudentGrade[];
}

async function upsertSummary(
  tq: TenantQuery,
  courseId: string,
  studentId: string,
  result: ReturnType<typeof computeCourseGrade>
): Promise<void> {
  const row = {
    course_id: courseId,
    student_id: studentId,
    percentage: result.percentage,
    letter: result.letter,
    breakdown: result.breakdown,
    computed_at: new Date().toISOString(),
  };

  // Tenant-query .upsert() goes through the wrapper's insert path; we use
  // raw + onConflict to take advantage of the unique (course, student)
  // index defined in migration 047.
  const { error } = await tq.raw
    .from('course_grade_summary')
    .upsert(
      { ...row, tenant_id: tq.tenantId },
      { onConflict: 'course_id,student_id' }
    );
  if (error) {
    throw new Error(`Failed to upsert grade summary: ${error.message}`);
  }
}

export interface RecomputeResult {
  percentage: number | null;
  letter: string | null;
}

/**
 * Recompute and persist the cached grade summary for one (course, student).
 * Cheap: a handful of indexed reads + one upsert. Safe to call from any
 * write path — this is the canonical hook.
 */
export async function recomputeCourseGradeSummary(
  tq: TenantQuery,
  courseId: string,
  studentId: string
): Promise<RecomputeResult> {
  const [snapshot, grades] = await Promise.all([
    loadCourseSnapshot(tq, courseId),
    loadStudentGrades(tq, courseId, studentId),
  ]);

  const result = computeCourseGrade({
    categories: snapshot.categories,
    items: snapshot.items,
    grades,
    letterScale: snapshot.letterScale,
  });

  await upsertSummary(tq, courseId, studentId, result);

  return { percentage: result.percentage, letter: result.letter };
}

/**
 * Recompute every student's summary for a course in a single pass. Used
 * after edits that affect the whole class (item points changed, category
 * weight changed, drop rules changed).
 *
 * The course snapshot loads once; per-student grades are fetched in one
 * query and grouped client-side. Cheaper than calling the single-student
 * function in a loop.
 */
export async function recomputeCourseGradeSummariesForCourse(
  tq: TenantQuery,
  courseId: string
): Promise<{ studentsProcessed: number }> {
  const snapshot = await loadCourseSnapshot(tq, courseId);

  const { data: grades, error: gradesErr } = await tq
    .from('course_grades')
    .select('grade_item_id, score, max_score, student_id')
    .eq('course_id', courseId);
  if (gradesErr) {
    throw new Error(`Failed to load course grades: ${gradesErr.message}`);
  }

  const byStudent = new Map<string, StudentGrade[]>();
  for (const g of (grades ?? []) as Array<StudentGrade & { student_id: string }>) {
    const list = byStudent.get(g.student_id) ?? [];
    list.push({
      grade_item_id: g.grade_item_id,
      score: g.score,
      max_score: g.max_score,
    });
    byStudent.set(g.student_id, list);
  }

  // Also include enrolled students with no grades yet, so their summary
  // exists as null and clears stale rows from a prior recompute.
  const { data: enrollments, error: enrollErr } = await tq
    .from('enrollments')
    .select('student_id')
    .eq('course_id', courseId)
    .eq('status', 'active');
  if (enrollErr) {
    throw new Error(`Failed to load enrollments: ${enrollErr.message}`);
  }
  for (const e of (enrollments ?? []) as Array<{ student_id: string }>) {
    if (!byStudent.has(e.student_id)) byStudent.set(e.student_id, []);
  }

  const rows = [];
  for (const [studentId, studentGrades] of byStudent) {
    const result = computeCourseGrade({
      categories: snapshot.categories,
      items: snapshot.items,
      grades: studentGrades,
      letterScale: snapshot.letterScale,
    });
    rows.push({
      tenant_id: tq.tenantId,
      course_id: courseId,
      student_id: studentId,
      percentage: result.percentage,
      letter: result.letter,
      breakdown: result.breakdown,
      computed_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await tq.raw
      .from('course_grade_summary')
      .upsert(rows, { onConflict: 'course_id,student_id' });
    if (error) {
      throw new Error(`Failed to upsert grade summaries: ${error.message}`);
    }
  }

  return { studentsProcessed: rows.length };
}
