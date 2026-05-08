import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { recomputeCourseGradeSummariesForCourse } from '@/lib/services/gradebook-summary';

const STAFF_ROLES = [
  'admin',
  'super_admin',
  'tenant_admin',
  'curriculum_designer',
] as const;

async function checkCourseInstructor(
  tq: ReturnType<typeof createTenantQuery>,
  userId: string,
  courseId: string
): Promise<boolean> {
  const { data } = await tq
    .from('course_instructors')
    .select('id')
    .eq('course_id', courseId)
    .eq('instructor_id', userId)
    .single();
  return !!data;
}

interface RawSummary {
  student_id: string;
  percentage: number | null;
  letter: string | null;
  breakdown: Array<{
    category_id: string;
    name: string;
    percentage: number | null;
    points: number;
    max_points: number;
  }>;
}

/**
 * Escape a value for inclusion in a CSV cell.
 * Quotes wrap any value that contains a comma, quote, newline, or
 * leading whitespace; embedded quotes are doubled per RFC 4180.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s === '') return '';
  if (/[",\r\n]/.test(s) || /^\s/.test(s) || /\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/courses/[id]/gradebook/export
 *
 * Streams a CSV with one row per enrolled student. Columns:
 *   Name, Email, [per item: title (max_score)], Total points,
 *   Total max, Total %, Letter, [per category: name %]
 *
 * Triggers a bulk recompute first so the export reflects the latest
 * engine totals + letters. Staff-only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success)
      return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, [...STAFF_ROLES]);
    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Refresh summaries before export so figures match what users see in
    // the UI right now. Failures are logged but don't fail the export —
    // we'll fall back to whatever is cached.
    try {
      await recomputeCourseGradeSummariesForCourse(tq, courseId);
    } catch (err) {
      console.error('Pre-export recompute failed:', err);
    }

    // Fetch in parallel: course title (for filename), students, items
    // (sorted), categories (for breakdown column order), grades, summaries.
    const [courseRes, studentsRes, itemsRes, catsRes, gradesRes, summariesRes] =
      await Promise.all([
        tq.from('courses').select('title').eq('id', courseId).single(),
        tq
          .from('enrollments')
          .select('users:users!enrollments_student_id_fkey(id, name, email)')
          .eq('course_id', courseId)
          .eq('status', 'active'),
        tq
          .from('course_grade_items')
          .select('id, title, points, sort_order, hidden, is_active')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        tq
          .from('course_grade_categories')
          .select('id, parent_id, name, sort_order, hidden')
          .eq('course_id', courseId)
          .order('sort_order', { ascending: true }),
        tq
          .from('course_grades')
          .select('student_id, grade_item_id, score, max_score')
          .eq('course_id', courseId),
        tq
          .from('course_grade_summary')
          .select('student_id, percentage, letter, breakdown')
          .eq('course_id', courseId),
      ]);

    if (studentsRes.error) {
      console.error('Export students fetch error:', studentsRes.error);
      return NextResponse.json(
        { error: 'Failed to load students' },
        { status: 500 }
      );
    }

    interface ItemRow {
      id: string;
      title: string;
      points: number;
      sort_order: number;
      hidden: boolean;
    }
    interface CatRow {
      id: string;
      parent_id: string | null;
      name: string;
      hidden: boolean;
    }

    const items: ItemRow[] = (itemsRes.data ?? []).filter(
      (i: ItemRow) => !i.hidden
    );
    const cats: CatRow[] = (catsRes.data ?? []).filter(
      (c: CatRow) => !c.hidden
    );

    interface RawStudent {
      users: { id: string; name: string | null; email: string } | null;
    }
    const students = (studentsRes.data as RawStudent[] | null ?? [])
      .map((row) => row.users)
      .filter((u): u is { id: string; name: string | null; email: string } => !!u);

    // Index grades by (student_id, grade_item_id).
    const gradeIndex = new Map<string, { score: number; max_score: number }>();
    for (const g of (gradesRes.data ?? []) as Array<{
      student_id: string;
      grade_item_id: string;
      score: number;
      max_score: number;
    }>) {
      gradeIndex.set(`${g.student_id}:${g.grade_item_id}`, g);
    }

    const summaryByStudent = new Map<string, RawSummary>();
    for (const s of (summariesRes.data ?? []) as RawSummary[]) {
      summaryByStudent.set(s.student_id, s);
    }

    // Header row.
    const itemHeaders = items.map(
      (i) => `${i.title} (max ${i.points})`
    );
    // Breakdown columns track the top-level (root.children) category set —
    // these are the entries that appear in summary.breakdown.
    const breakdownCats = cats.filter((c) => {
      // Find any root category. Top-level breakdown uses children of root.
      const root = cats.find((x) => x.parent_id === null);
      return root && c.parent_id === root.id;
    });
    const breakdownHeaders = breakdownCats.map((c) => `${c.name} %`);

    const header = [
      'Student name',
      'Email',
      ...itemHeaders,
      'Total points',
      'Total max',
      'Total %',
      'Letter',
      ...breakdownHeaders,
    ];

    const rows: string[][] = [header];

    for (const student of students) {
      let earned = 0;
      let max = 0;
      const itemCells: string[] = [];
      for (const item of items) {
        const grade = gradeIndex.get(`${student.id}:${item.id}`);
        if (grade) {
          earned += Number(grade.score);
          max += Number(grade.max_score || item.points);
          itemCells.push(String(grade.score));
        } else {
          max += Number(item.points);
          itemCells.push('');
        }
      }

      const summary = summaryByStudent.get(student.id);
      const enginePct = summary?.percentage;
      const fallbackPct = max > 0 ? (earned / max) * 100 : null;
      const finalPct = enginePct != null ? enginePct : fallbackPct;

      // Map breakdown categories by id for quick lookup.
      const breakdownByCatId = new Map<string, number | null>();
      for (const b of summary?.breakdown ?? []) {
        breakdownByCatId.set(b.category_id, b.percentage);
      }
      const breakdownCells = breakdownCats.map((c) => {
        const v = breakdownByCatId.get(c.id);
        return v == null ? '' : v.toFixed(2);
      });

      rows.push([
        student.name ?? '',
        student.email,
        ...itemCells,
        String(earned),
        String(max),
        finalPct != null ? finalPct.toFixed(2) : '',
        summary?.letter ?? '',
        ...breakdownCells,
      ]);
    }

    const csv =
      rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';

    const courseTitle = (courseRes.data as { title?: string } | null)?.title;
    const safeTitle = (courseTitle ?? 'gradebook')
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || 'gradebook';
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeTitle}_${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('Gradebook export error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
