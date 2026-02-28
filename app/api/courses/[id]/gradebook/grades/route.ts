import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Check if user has access to this course
    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);
    const isEnrolled = await checkEnrollment(tq, user.id, courseId);

    if (!isInstructor && !isAdmin && !isEnrolled) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    let query = tq
      .from("course_grades")
      .select(`
        *,
        grade_item:course_grade_items(title, type, category, points),
        student:users!course_grades_student_id_fkey(id, name, email)
      `)
      .eq("course_id", courseId);

    // If student_id is provided, filter by student
    if (studentId) {
      query = query.eq("student_id", studentId);
    } else if (!isInstructor && !isAdmin) {
      // Students can only see their own grades
      query = query.eq("student_id", user.id);
    }

    const { data: grades, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error('Grades fetch error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Query details - courseId:', courseId, 'studentId:', studentId, 'isInstructor:', isInstructor, 'isAdmin:', isAdmin);
      return NextResponse.json({
        error: "Failed to fetch grades",
        details: error.message || String(error)
      }, { status: 500 });
    }

    console.log(`Fetched ${grades?.length || 0} grades for course ${courseId}`);
    return NextResponse.json({ grades: grades || [] });

  } catch (e: any) {
    console.error('Grades GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Check if user has access to this course
    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const data = await request.json();
    const { entries } = data; // Array of grade entries

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Invalid entries format" }, { status: 400 });
    }

    // Process each grade entry with proper error handling
    const processedEntries = [];

    for (const entry of entries) {
      const { grade_item_id, student_id, score, feedback } = entry;

      if (!grade_item_id || !student_id || score === undefined) {
        console.error('Missing required fields:', { grade_item_id, student_id, score });
        throw new Error("Missing required fields in grade entry");
      }

      // Get the grade item to calculate percentage
      const { data: item, error: itemError } = await tq
        .from("course_grade_items")
        .select("points")
        .eq("id", grade_item_id)
        .eq("course_id", courseId)
        .single();

      if (itemError) {
        console.error('Grade item lookup error:', itemError);
        console.error('Looking for grade_item_id:', grade_item_id, 'in course:', courseId);
        throw new Error(`Grade item not found: ${itemError.message || 'Item does not exist'}`);
      }

      if (!item) {
        console.error('Grade item is null for id:', grade_item_id);
        throw new Error("Grade item not found");
      }

      const maxScore = item.points || 100; // Default to 100 if null
      const percentage = maxScore > 0 ? (Number(score) / maxScore) * 100 : 0;

      processedEntries.push({
        course_id: courseId,
        student_id,
        grade_item_id,
        score: Number(score),
        max_score: maxScore,
        percentage: Number(percentage.toFixed(2)),
        feedback: feedback || null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Insert grades using upsert to handle duplicates
    const { data: grades, error } = await tq
      .from("course_grades")
      .upsert(processedEntries, {
        onConflict: "student_id,grade_item_id"
      })
      .select();

    if (error) {
      console.error('Grades creation error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return NextResponse.json({
        error: "Failed to create grades",
        details: error.message || String(error)
      }, { status: 500 });
    }

    return NextResponse.json({ grades: grades || [] });

  } catch (e: any) {
    console.error('Grades POST API error:', e);
    console.error('Error stack:', e.stack);
    return NextResponse.json({
      error: "Internal server error",
      message: e.message || String(e),
      details: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Check if user has access to this course
    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const data = await request.json();
    const { id: gradeId, score, feedback } = data;

    if (!gradeId || score === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the existing grade to calculate new percentage
    const { data: existingGrade, error: fetchError } = await tq
      .from("course_grades")
      .select("max_score")
      .eq("id", gradeId)
      .eq("course_id", courseId)
      .single();

    if (fetchError || !existingGrade) {
      return NextResponse.json({ error: "Grade not found" }, { status: 404 });
    }

    const percentage = existingGrade.max_score > 0 ? (Number(score) / existingGrade.max_score) * 100 : 0;

    // Update grade
    const { data: grade, error } = await tq
      .from("course_grades")
      .update({
        score: Number(score),
        percentage: Number(percentage.toFixed(2)),
        feedback: feedback || null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", gradeId)
      .eq("course_id", courseId)
      .select()
      .single();

    if (error) {
      console.error('Grade update error:', error);
      return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
    }

    return NextResponse.json(grade);

  } catch (e: any) {
    console.error('Grade PUT API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to check if user is instructor for a course
async function checkCourseInstructor(tq: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await tq
    .from("course_instructors")
    .select("id")
    .eq("course_id", courseId)
    .eq("instructor_id", userId)
    .single();

  return !!data;
}

// Helper function to check if user is enrolled in a course
async function checkEnrollment(tq: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await tq
    .from("enrollments")
    .select("id")
    .eq("student_id", userId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .single();

  return !!data;
}
