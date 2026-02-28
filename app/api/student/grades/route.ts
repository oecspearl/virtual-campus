import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database-helpers";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

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

    const courseIds = enrollments?.map(e => e.course_id) || [];

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
      // Continue anyway - we'll just use course_id filter
    }

    const gradeItemIds = gradeItems?.map(item => item.id) || [];

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

    // If we have grade item IDs, filter by them to exclude inactive items
    if (gradeItemIds.length > 0) {
      gradesQuery = gradesQuery.in("grade_item_id", gradeItemIds);
    }

    const { data: grades, error: gradesError } = await gradesQuery
      .order("graded_at", { ascending: false, nullsFirst: false });

    if (gradesError) {
      console.error("[Student Grades API] Grades fetch error:", gradesError);
      return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
    }

    // Cast grade_item from array type to single object (Supabase returns single object for FK joins at runtime)
    type GradeItem = { id: string; title: string; type: string; category: string; points: number; assessment_id: string | null; is_active: boolean };
    const getGradeItem = (grade: any): GradeItem | null => {
      const gi = grade.grade_item;
      if (!gi) return null;
      return (Array.isArray(gi) ? gi[0] : gi) as GradeItem | null;
    };

    // Filter out grades for inactive grade items and verify quiz/assignment still exists
    let validGrades = (grades || []).filter(grade => {
      const gradeItem = getGradeItem(grade);
      // Must have a grade_item
      if (!gradeItem) return false;
      // Grade item must be active
      if (!gradeItem.is_active) return false;
      return true;
    });

    // Verify quizzes and assignments still exist
    if (validGrades.length > 0) {
      const quizIds = validGrades
        .filter(g => { const gi = getGradeItem(g); return gi?.type === 'quiz' && gi?.assessment_id; })
        .map(g => getGradeItem(g)!.assessment_id)
        .filter((id): id is string => !!id);

      const assignmentIds = validGrades
        .filter(g => { const gi = getGradeItem(g); return gi?.type === 'assignment' && gi?.assessment_id; })
        .map(g => getGradeItem(g)!.assessment_id)
        .filter((id): id is string => !!id);

      const existingQuizIds = new Set<string>();
      const existingAssignmentIds = new Set<string>();

      if (quizIds.length > 0) {
        const { data: quizzes } = await tq
          .from("quizzes")
          .select("id")
          .in("id", quizIds);
        quizzes?.forEach(q => existingQuizIds.add(q.id));
      }

      if (assignmentIds.length > 0) {
        const { data: assignments } = await tq
          .from("assignments")
          .select("id")
          .in("id", assignmentIds);
        assignments?.forEach(a => existingAssignmentIds.add(a.id));
      }

      // Filter out grades for deleted quizzes/assignments
      validGrades = validGrades.filter(grade => {
        const gradeItem = getGradeItem(grade);
        if (!gradeItem) return false;

        if (gradeItem.type === 'quiz' && gradeItem.assessment_id) {
          return existingQuizIds.has(gradeItem.assessment_id);
        }
        if (gradeItem.type === 'assignment' && gradeItem.assessment_id) {
          return existingAssignmentIds.has(gradeItem.assessment_id);
        }
        // For 'other' types without assessment_id, keep them
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
  } catch (error: any) {
    console.error("[Student Grades API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
