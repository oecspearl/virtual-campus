import { NextResponse } from "next/server";
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async ({ user, tq }) => {
  // Get user's enrolled course IDs
  const { data: enrollments, error: enrollmentsError } = await tq
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id)
    .eq("status", "active");

  if (enrollmentsError) {
    console.error("[Student Grades API] Enrollments fetch error:", enrollmentsError);
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
  }

  const courseIds = enrollments?.map((e: any) => e.course_id) || [];

  if (courseIds.length === 0) {
    return NextResponse.json({ grades: [] });
  }

  // Get all grade items for enrolled courses (only active ones)
  const { data: gradeItems, error: itemsError } = await tq
    .from("course_grade_items")
    .select("id, course_id")
    .in("course_id", courseIds)
    .eq("is_active", true);

  if (itemsError) {
    console.error("[Student Grades API] Grade items fetch error:", itemsError);
  }

  const gradeItemIds = gradeItems?.map((item: any) => item.id) || [];

  // Get student's grades with related data
  let gradesQuery = tq
    .from("course_grades")
    .select(`
      id,
      score,
      max_score,
      percentage,
      graded_at,
      course_id,
      grade_item_id,
      grade_item:course_grade_items(
        id,
        title,
        type,
        category,
        points,
        assessment_id,
        is_active
      ),
      course:courses(
        id,
        title
      )
    `)
    .eq("student_id", user.id)
    .in("course_id", courseIds);

  if (gradeItemIds.length > 0) {
    gradesQuery = gradesQuery.in("grade_item_id", gradeItemIds);
  }

  const { data: grades, error: gradesError } = await gradesQuery
    .order("graded_at", { ascending: false, nullsFirst: false });

  if (gradesError) {
    console.error("[Student Grades API] Grades fetch error:", gradesError);
    return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
  }

  type GradeItem = { id: string; title: string; type: string; category: string; points: number; assessment_id: string | null; is_active: boolean };
  const getGradeItem = (grade: any): GradeItem | null => {
    const gi = grade.grade_item;
    if (!gi) return null;
    return (Array.isArray(gi) ? gi[0] : gi) as GradeItem | null;
  };

  // Filter out grades for inactive grade items
  let validGrades = (grades || []).filter((grade: any) => {
    const gradeItem = getGradeItem(grade);
    if (!gradeItem) return false;
    if (!gradeItem.is_active) return false;
    return true;
  });

  // Verify quizzes and assignments still exist
  if (validGrades.length > 0) {
    const quizIds = validGrades
      .filter((g: any) => { const gi = getGradeItem(g); return gi?.type === 'quiz' && gi?.assessment_id; })
      .map((g: any) => getGradeItem(g)!.assessment_id)
      .filter((id: any): id is string => !!id);

    const assignmentIds = validGrades
      .filter((g: any) => { const gi = getGradeItem(g); return gi?.type === 'assignment' && gi?.assessment_id; })
      .map((g: any) => getGradeItem(g)!.assessment_id)
      .filter((id: any): id is string => !!id);

    const existingQuizIds = new Set<string>();
    const existingAssignmentIds = new Set<string>();

    if (quizIds.length > 0) {
      const { data: quizzes } = await tq
        .from("quizzes")
        .select("id")
        .in("id", quizIds);
      quizzes?.forEach((q: any) => existingQuizIds.add(q.id));
    }

    if (assignmentIds.length > 0) {
      const { data: assignments } = await tq
        .from("assignments")
        .select("id")
        .in("id", assignmentIds);
      assignments?.forEach((a: any) => existingAssignmentIds.add(a.id));
    }

    validGrades = validGrades.filter((grade: any) => {
      const gradeItem = getGradeItem(grade);
      if (!gradeItem) return false;
      if (gradeItem.type === 'quiz' && gradeItem.assessment_id) {
        return existingQuizIds.has(gradeItem.assessment_id);
      }
      if (gradeItem.type === 'assignment' && gradeItem.assessment_id) {
        return existingAssignmentIds.has(gradeItem.assessment_id);
      }
      return true;
    });
  }

  return NextResponse.json({
    grades: validGrades
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});
