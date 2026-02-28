import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { updateCompetenciesFromAssignment } from "@/lib/adaptive-learning";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id: assignmentId, submissionId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();
    const data = await request.json();
    
    const { feedback, grade } = data;

    // Validate required fields
    if (grade === undefined) {
      return NextResponse.json({ error: "Grade is required" }, { status: 400 });
    }

    // Check if user is instructor/admin for this assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("creator_id, lesson_id, points")
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Check authorization
    const isCreator = assignment.creator_id === user.id;
    const isAdmin = user.role && ['admin', 'super_admin', 'curriculum_designer'].includes(user.role);
    
    let isCourseInstructor = false;
    if (assignment.lesson_id) {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("course_id")
        .eq("id", assignment.lesson_id)
        .single();
      
      if (lesson?.course_id) {
        const { data: instructorCheck } = await supabase
          .from("course_instructors")
          .select("id")
          .eq("course_id", lesson.course_id)
          .eq("instructor_id", user.id)
          .single();
        
        isCourseInstructor = !!instructorCheck;
      }
    }

    if (!isCreator && !isAdmin && !isCourseInstructor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate grade is within assignment points
    const maxPoints = assignment.points || 100;
    if (grade < 0 || grade > maxPoints) {
      return NextResponse.json({ 
        error: `Grade must be between 0 and ${maxPoints}` 
      }, { status: 400 });
    }

    // Update the submission with grade and feedback
    const { data: updatedSubmission, error: updateError } = await serviceSupabase
      .from("assignment_submissions")
      .update({
        grade: Number(grade),
        feedback: feedback || null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        status: 'graded',
        updated_at: new Date().toISOString()
      })
      .eq("id", submissionId)
      .eq("assignment_id", assignmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Assignment submission grading error:', updateError);
      return NextResponse.json({ error: "Failed to grade submission" }, { status: 500 });
    }

    // Sync to gradebook if assignment is associated with a course
    if (assignment.lesson_id) {
      try {
        const { data: lesson } = await supabase
          .from("lessons")
          .select("course_id")
          .eq("id", assignment.lesson_id)
          .single();
        
        if (lesson?.course_id) {
          // Get the student info
          const { data: submission } = await serviceSupabase
            .from("assignment_submissions")
            .select("student_id")
            .eq("id", submissionId)
            .single();

          if (submission?.student_id) {
            // Check if grade item exists for this assignment
            const { data: gradeItem } = await serviceSupabase
              .from("course_grade_items")
              .select("id")
              .eq("course_id", lesson.course_id)
              .eq("type", "assignment")
              .eq("assessment_id", assignmentId)
              .single();

            if (gradeItem) {
              // Update or create grade in course_grades
              const percentage = maxPoints > 0 ? (Number(grade) / maxPoints) * 100 : 0;
              
              await serviceSupabase
                .from("course_grades")
                .upsert([{
                  course_id: lesson.course_id,
                  student_id: submission.student_id,
                  grade_item_id: gradeItem.id,
                  score: Number(grade),
                  max_score: maxPoints,
                  percentage: Number(percentage.toFixed(2)),
                  feedback: feedback || null,
                  graded_by: user.id,
                  graded_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }], {
                  onConflict: "student_id,grade_item_id"
                });
            }
          }
        }
      } catch (syncError) {
        console.error('Gradebook sync error:', syncError);
        // Don't fail the grading if gradebook sync fails
      }
    }

    // Send email notification to student
    try {
      const { notifyGradePosted } = await import('@/lib/notifications');
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Get assignment and course info
      const { data: assignmentFull } = await supabase
        .from("assignments")
        .select("title, points, lesson_id")
        .eq("id", assignmentId)
        .single();

      let courseTitle = 'Your Course';
      let courseId: string | null = null;
      
      if (assignmentFull?.lesson_id) {
        const { data: lesson } = await supabase
          .from("lessons")
          .select("subject_id, subjects(course_id, courses(title))")
          .eq("id", assignmentFull.lesson_id)
          .single();
        
        if (lesson && lesson.subjects) {
          const subject = Array.isArray(lesson.subjects) ? lesson.subjects[0] : lesson.subjects;
          if (subject) {
            courseId = subject.course_id;
            if (subject.courses && typeof subject.courses === 'object') {
              courseTitle = (subject.courses as any).title || courseTitle;
            }
          }
        }
      }
      
      // Fallback: try to get course from assignment directly
      if (!courseId && assignmentFull) {
        const { data: assignmentWithCourse } = await supabase
          .from("assignments")
          .select("courses(id, title)")
          .eq("id", assignmentId)
          .single();
        
        if (assignmentWithCourse && (assignmentWithCourse as any).courses) {
          courseId = (assignmentWithCourse as any).courses.id;
          courseTitle = (assignmentWithCourse as any).courses.title || courseTitle;
        }
      }

      await notifyGradePosted(updatedSubmission.student_id, {
        assignmentName: assignmentFull?.title || 'Assignment',
        courseTitle,
        score: Number(grade),
        totalPoints: maxPoints,
        percentage: maxPoints > 0 ? Math.round((Number(grade) / maxPoints) * 100) : 0,
        feedback: feedback || undefined,
        courseUrl: courseId ? `${appUrl}/courses/${courseId}` : `${appUrl}/assignments/${assignmentId}`,
      });
    } catch (notifError) {
      // Don't fail grading if notification fails
      console.error('Failed to send grade notification:', notifError);
    }

    // Update student competencies based on assignment grade
    try {
      const percentage = maxPoints > 0 ? (Number(grade) / maxPoints) * 100 : 0;
      const compResult = await updateCompetenciesFromAssignment(
        assignmentId,
        updatedSubmission.student_id,
        percentage
      );
      if (compResult.updated > 0) {
        console.log(`Updated ${compResult.updated} competencies for student ${updatedSubmission.student_id}`);
      }
    } catch (compError) {
      console.error('Competency update error:', compError);
      // Don't fail grading if competency update fails
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: "Submission graded successfully"
    });

  } catch (e: any) {
    console.error('Assignment grading API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
