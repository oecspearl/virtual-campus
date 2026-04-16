import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { checkStudentEnrollment } from "@/lib/enrollment-check";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();
    const data = await request.json();
    
    const { submission_type, content, files, status } = data;

    // Validate required fields
    if (!submission_type || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate submission_type
    if (!['file', 'text', 'url'].includes(submission_type)) {
      return NextResponse.json({ error: "Invalid submission type" }, { status: 400 });
    }

    // Validate status
    if (!['draft', 'submitted'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get assignment details to check due date and course association
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("due_date, allow_late_submissions, course_id, lesson_id")
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Verify student is enrolled in the course this assignment belongs to
    let assignmentCourseId = assignment.course_id;
    if (!assignmentCourseId && assignment.lesson_id) {
      const { data: lesson } = await serviceSupabase
        .from("lessons")
        .select("course_id")
        .eq("id", assignment.lesson_id)
        .single();
      assignmentCourseId = lesson?.course_id;
    }
    if (assignmentCourseId) {
      const { enrolled } = await checkStudentEnrollment(user.id, assignmentCourseId);
      if (!enrolled) {
        return NextResponse.json({ error: "You must be enrolled in this course to submit" }, { status: 403 });
      }
    }

    // Check if submission is late
    const isLate = assignment.due_date && 
                  new Date() > new Date(assignment.due_date) && 
                  status === 'submitted';

    // Check if late submissions are allowed
    if (isLate && !assignment.allow_late_submissions) {
      return NextResponse.json({ 
        error: "Late submissions are not allowed for this assignment" 
      }, { status: 400 });
    }

    // Prepare submission data
    const submissionData = {
      assignment_id: assignmentId,
      student_id: user.id,
      submission_type,
      content: content || null,
      files: files ? JSON.stringify(files) : null,
      status,
      submitted_at: status === 'submitted' ? new Date().toISOString() : null,
      late: isLate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check if there's an existing submission
    const { data: existingSubmission } = await serviceSupabase
      .from("assignment_submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single();

    let result;
    if (existingSubmission) {
      // Update existing submission
      const { data: submission, error } = await serviceSupabase
        .from("assignment_submissions")
        .update(submissionData)
        .eq("id", existingSubmission.id)
        .select()
        .single();

      if (error) {
        console.error('Assignment submission update error:', error);
        return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
      }
      result = submission;
    } else {
      // Create new submission
      const { data: submission, error } = await serviceSupabase
        .from("assignment_submissions")
        .insert([submissionData])
        .select()
        .single();

      if (error) {
        console.error('Assignment submission creation error:', error);
        return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
      }
      result = submission;
    }

    return NextResponse.json({
      success: true,
      submission: result,
      message: status === 'draft' ? 'Draft saved successfully' : 'Assignment submitted successfully'
    });

  } catch (e: any) {
    console.error('Assignment submission API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Check if this is a request for all submissions (instructor view)
    const url = new URL(request.url);
    const allSubmissions = url.searchParams.get('all') === '1';

    if (allSubmissions) {
      // Instructor view - get all submissions for this assignment
      // First check if user is instructor/admin for this assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .select("creator_id, lesson_id, anonymous_grading")
        .eq("id", assignmentId)
        .single();

      if (assignmentError || !assignment) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      // Check if user is the creator, admin, or course instructor
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

      // Get all submissions for this assignment with student info
      const { data: submissions, error: submissionsError } = await serviceSupabase
        .from("assignment_submissions")
        .select(`
          *,
          users!assignment_submissions_student_id_fkey(
            id,
            email,
            name
          )
        `)
        .eq("assignment_id", assignmentId)
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.error('Assignment submissions fetch error:', submissionsError);
        return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
      }

      // If anonymous grading is enabled, mask student information
      let processedSubmissions = submissions || [];
      const isAnonymous = assignment.anonymous_grading === true;

      if (isAnonymous) {
        // Shuffle submissions deterministically by assignment ID to ensure stable anonymous numbering
        const shuffled = [...processedSubmissions].sort((a: any, b: any) => {
          const hashA = (a.id || '').split('').reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) | 0, 0);
          const hashB = (b.id || '').split('').reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) | 0, 0);
          return hashA - hashB;
        });
        processedSubmissions = shuffled.map((sub: any, index: number) => ({
          ...sub,
          users: {
            id: `anonymous_${index + 1}`,
            email: `student_${index + 1}@anonymous`,
            name: `Student ${index + 1}`
          },
          _anonymous: true
        }));
      }

      return NextResponse.json({
        submissions: processedSubmissions,
        anonymous_grading: isAnonymous
      });
    } else {
      // Student view - get only the user's submission
      const { data: submission, error } = await serviceSupabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Assignment submission fetch error:', error);
        return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
      }

      return NextResponse.json({
        submission: submission || null
      });
    }

  } catch (e: any) {
    console.error('Assignment submission GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
