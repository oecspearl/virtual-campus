import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

interface GradeRow {
  student_email: string;
  grade_item: string;
  score: number;
  feedback?: string;
}

interface ProcessResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * POST /api/courses/[id]/gradebook/upload
 * Bulk upload grades via CSV data
 *
 * Expected CSV format:
 * student_email,grade_item,score,feedback
 * student@example.com,Midterm Exam,85,Good work
 */
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
    const { data: instructorCheck } = await tq
      .from("course_instructors")
      .select("id")
      .eq("course_id", courseId)
      .eq("instructor_id", user.id)
      .single();

    const isInstructor = !!instructorCheck;
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { grades, update_existing = true } = body;

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json({
        error: "Invalid data format. Expected array of grade objects with: student_email, grade_item, score"
      }, { status: 400 });
    }

    // Get all grade items for this course
    const { data: gradeItems } = await tq
      .from("course_grade_items")
      .select("id, title, points")
      .eq("course_id", courseId);

    if (!gradeItems || gradeItems.length === 0) {
      return NextResponse.json({
        error: "No grade items found for this course. Please create grade items first."
      }, { status: 400 });
    }

    // Create a map of grade item titles (case-insensitive) to IDs
    const gradeItemMap = new Map<string, { id: string; points: number }>();
    gradeItems.forEach(item => {
      gradeItemMap.set(item.title.toLowerCase().trim(), { id: item.id, points: item.points || 100 });
    });

    // Get all enrolled students for this course
    const { data: enrollments } = await tq
      .from("enrollments")
      .select("student_id, users!enrollments_student_id_fkey(id, email)")
      .eq("course_id", courseId)
      .eq("status", "active");

    // Create a map of student emails to IDs
    const studentMap = new Map<string, string>();
    enrollments?.forEach((e: any) => {
      if (e.users?.email) {
        studentMap.set(e.users.email.toLowerCase().trim(), e.users.id);
      }
    });

    // Process grades
    const result: ProcessResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    const gradesToInsert: any[] = [];

    for (let i = 0; i < grades.length; i++) {
      const row = grades[i] as GradeRow;
      const rowNum = i + 1;

      // Validate required fields
      if (!row.student_email || !row.grade_item || row.score === undefined) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Missing required fields (student_email, grade_item, score)`);
        continue;
      }

      // Look up student
      const studentId = studentMap.get(row.student_email.toLowerCase().trim());
      if (!studentId) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Student not found or not enrolled: ${row.student_email}`);
        continue;
      }

      // Look up grade item
      const gradeItemInfo = gradeItemMap.get(row.grade_item.toLowerCase().trim());
      if (!gradeItemInfo) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Grade item not found: ${row.grade_item}`);
        continue;
      }

      // Validate score
      const score = Number(row.score);
      if (isNaN(score) || score < 0) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Invalid score: ${row.score}`);
        continue;
      }

      if (score > gradeItemInfo.points) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Score (${score}) exceeds max points (${gradeItemInfo.points}) for ${row.grade_item}`);
        continue;
      }

      // Calculate percentage
      const percentage = gradeItemInfo.points > 0 ? (score / gradeItemInfo.points) * 100 : 0;

      gradesToInsert.push({
        course_id: courseId,
        student_id: studentId,
        grade_item_id: gradeItemInfo.id,
        score: score,
        max_score: gradeItemInfo.points,
        percentage: Number(percentage.toFixed(2)),
        feedback: row.feedback || null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Insert/update grades in batches
    if (gradesToInsert.length > 0) {
      if (update_existing) {
        // Use upsert to update existing grades
        const { error } = await tq
          .from("course_grades")
          .upsert(gradesToInsert, {
            onConflict: "student_id,grade_item_id"
          });

        if (error) {
          console.error('Bulk grade insert error:', error);
          return NextResponse.json({
            error: "Failed to save grades",
            details: error.message
          }, { status: 500 });
        }
      } else {
        // Only insert new grades (skip existing)
        for (const grade of gradesToInsert) {
          const { data: existing } = await tq
            .from("course_grades")
            .select("id")
            .eq("student_id", grade.student_id)
            .eq("grade_item_id", grade.grade_item_id)
            .single();

          if (existing) {
            result.failed++;
            result.errors.push(`Skipped: Grade already exists for student`);
            continue;
          }

          const { error } = await tq
            .from("course_grades")
            .insert([grade]);

          if (error) {
            result.failed++;
            result.errors.push(`Failed to insert grade: ${error.message}`);
          } else {
            result.success++;
          }
        }

        return NextResponse.json({
          success: true,
          message: `Processed ${grades.length} rows`,
          result
        });
      }

      result.success = gradesToInsert.length;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${grades.length} rows`,
      result: {
        ...result,
        total: grades.length
      }
    });

  } catch (e: any) {
    console.error('Bulk grade upload error:', e);
    return NextResponse.json({
      error: "Internal server error",
      details: e.message
    }, { status: 500 });
  }
}

/**
 * GET /api/courses/[id]/gradebook/upload
 * Get CSV template and info about grade items
 */
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
    const { data: instructorCheck } = await tq
      .from("course_instructors")
      .select("id")
      .eq("course_id", courseId)
      .eq("instructor_id", user.id)
      .single();

    const isInstructor = !!instructorCheck;
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get grade items
    const { data: gradeItems } = await tq
      .from("course_grade_items")
      .select("id, title, points, category")
      .eq("course_id", courseId)
      .order("order", { ascending: true });

    // Get enrolled students
    const { data: enrollments } = await tq
      .from("enrollments")
      .select("student_id, users!enrollments_student_id_fkey(id, email, name)")
      .eq("course_id", courseId)
      .eq("status", "active");

    const students = enrollments?.map((e: any) => ({
      email: e.users?.email,
      name: e.users?.name
    })).filter((s: any) => s.email) || [];

    // Generate sample CSV
    const sampleRows = students.slice(0, 3).map((s: any) =>
      `${s.email},${gradeItems?.[0]?.title || 'Assignment 1'},85,Good work`
    );

    const csvTemplate = [
      'student_email,grade_item,score,feedback',
      ...sampleRows
    ].join('\n');

    return NextResponse.json({
      grade_items: gradeItems || [],
      students: students,
      csv_template: csvTemplate,
      instructions: {
        format: "CSV with headers: student_email, grade_item, score, feedback (optional)",
        grade_items: gradeItems?.map((g: any) => `${g.title} (max: ${g.points || 100} points)`) || [],
        notes: [
          "Student email must match an enrolled student",
          "Grade item must match exactly (case-insensitive)",
          "Score must be between 0 and the max points for the grade item",
          "Feedback is optional"
        ]
      }
    });

  } catch (e: any) {
    console.error('Grade upload template error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
