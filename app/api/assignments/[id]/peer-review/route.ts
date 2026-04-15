import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

/**
 * GET /api/assignments/[id]/peer-review
 * Get peer review assignments for the current user
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const serviceSupabase = createServiceSupabaseClient();

    // Check if user is instructor/admin
    const isInstructor = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);

    // Get assignment details
    const { data: assignment, error: assignmentError } = await serviceSupabase
      .from("assignments")
      .select("peer_review_enabled, peer_reviews_required, peer_review_due_date, peer_review_anonymous, peer_review_rubric")
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (!assignment.peer_review_enabled) {
      return NextResponse.json({ error: "Peer review not enabled for this assignment" }, { status: 400 });
    }

    if (isInstructor) {
      // Instructors see all peer review assignments and reviews
      const { data: peerAssignments } = await serviceSupabase
        .from("peer_review_assignments")
        .select(`
          *,
          reviewer:users!peer_review_assignments_reviewer_id_fkey(id, name, email),
          submission:assignment_submissions!peer_review_assignments_submission_id_fkey(
            id, student_id, submitted_at,
            student:users!assignment_submissions_student_id_fkey(id, name, email)
          )
        `)
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: true });

      const { data: reviews } = await serviceSupabase
        .from("peer_reviews")
        .select("*")
        .eq("assignment_id", assignmentId);

      return NextResponse.json({
        assignment: {
          peer_review_enabled: assignment.peer_review_enabled,
          peer_reviews_required: assignment.peer_reviews_required,
          peer_review_due_date: assignment.peer_review_due_date,
          peer_review_anonymous: assignment.peer_review_anonymous,
          peer_review_rubric: assignment.peer_review_rubric
        },
        peer_assignments: peerAssignments || [],
        reviews: reviews || []
      });
    } else {
      // Students see only their assigned reviews
      const { data: myAssignments } = await serviceSupabase
        .from("peer_review_assignments")
        .select(`
          *,
          submission:assignment_submissions!peer_review_assignments_submission_id_fkey(
            id, content, files, submitted_at
          )
        `)
        .eq("assignment_id", assignmentId)
        .eq("reviewer_id", user.id);

      // Get reviews I've written
      const { data: myReviews } = await serviceSupabase
        .from("peer_reviews")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("reviewer_id", user.id);

      // Get reviews of my submission (anonymized if needed)
      const { data: mySubmission } = await serviceSupabase
        .from("assignment_submissions")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .single();

      let reviewsOfMe: any[] = [];
      if (mySubmission) {
        const { data } = await serviceSupabase
          .from("peer_reviews")
          .select("feedback, rubric_scores, overall_score, created_at")
          .eq("submission_id", mySubmission.id);

        reviewsOfMe = data || [];
      }

      return NextResponse.json({
        assignment: {
          peer_review_enabled: assignment.peer_review_enabled,
          peer_reviews_required: assignment.peer_reviews_required,
          peer_review_due_date: assignment.peer_review_due_date,
          peer_review_rubric: assignment.peer_review_rubric
        },
        my_assignments: myAssignments || [],
        my_reviews: myReviews || [],
        reviews_of_me: reviewsOfMe
      });
    }

  } catch (e: any) {
    console.error("Peer review GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/assignments/[id]/peer-review
 * Submit a peer review OR assign peer reviewers (instructor action)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const serviceSupabase = createServiceSupabaseClient();
    const body = await request.json();

    // Check if this is an assign action (instructor) or submit review (student)
    if (body.action === "assign") {
      // Instructor action: assign peer reviewers
      if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Get all submitted submissions
      const { data: submissions } = await serviceSupabase
        .from("assignment_submissions")
        .select("id, student_id")
        .eq("assignment_id", assignmentId)
        .eq("status", "submitted");

      if (!submissions || submissions.length < 2) {
        return NextResponse.json({
          error: "Need at least 2 submissions to assign peer reviews"
        }, { status: 400 });
      }

      // Get assignment settings
      const { data: assignment } = await serviceSupabase
        .from("assignments")
        .select("peer_reviews_required")
        .eq("id", assignmentId)
        .single();

      const reviewsRequired = assignment?.peer_reviews_required || 2;

      // Create peer review assignments using round-robin
      const assignments: any[] = [];
      const studentIds = submissions.map(s => s.student_id);

      for (const submission of submissions) {
        // Get reviewers (other students, not the submitter)
        const otherStudents = studentIds.filter(id => id !== submission.student_id);

        // Shuffle and pick required number of reviewers
        const shuffled = otherStudents.sort(() => Math.random() - 0.5);
        const reviewers = shuffled.slice(0, Math.min(reviewsRequired, shuffled.length));

        for (const reviewerId of reviewers) {
          assignments.push({
            assignment_id: assignmentId,
            reviewer_id: reviewerId,
            submission_id: submission.id,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // Clear existing assignments and insert new ones
      await serviceSupabase
        .from("peer_review_assignments")
        .delete()
        .eq("assignment_id", assignmentId);

      const { error: insertError } = await serviceSupabase
        .from("peer_review_assignments")
        .insert(assignments);

      if (insertError) {
        console.error("Error assigning peer reviews:", insertError);
        return NextResponse.json({ error: "Failed to assign peer reviews" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Assigned ${assignments.length} peer reviews`,
        assignments_count: assignments.length
      });

    } else {
      // Student action: submit a review
      const { peer_assignment_id, submission_id, feedback, rubric_scores, overall_score } = body;

      if (!peer_assignment_id || !submission_id) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Verify the peer assignment belongs to this user
      const { data: peerAssignment } = await serviceSupabase
        .from("peer_review_assignments")
        .select("*")
        .eq("id", peer_assignment_id)
        .eq("reviewer_id", user.id)
        .single();

      if (!peerAssignment) {
        return NextResponse.json({ error: "Peer assignment not found" }, { status: 404 });
      }

      // Create or update the review
      const reviewData = {
        peer_assignment_id,
        assignment_id: assignmentId,
        reviewer_id: user.id,
        submission_id,
        feedback: feedback || null,
        rubric_scores: rubric_scores || null,
        overall_score: overall_score || null,
        updated_at: new Date().toISOString()
      };

      const { data: existingReview } = await serviceSupabase
        .from("peer_reviews")
        .select("id")
        .eq("peer_assignment_id", peer_assignment_id)
        .single();

      let review;
      if (existingReview) {
        const { data, error } = await serviceSupabase
          .from("peer_reviews")
          .update(reviewData)
          .eq("id", existingReview.id)
          .select()
          .single();

        if (error) throw error;
        review = data;
      } else {
        const { data, error } = await serviceSupabase
          .from("peer_reviews")
          .insert([{ ...reviewData, created_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) throw error;
        review = data;
      }

      // Update peer assignment status
      await serviceSupabase
        .from("peer_review_assignments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", peer_assignment_id);

      return NextResponse.json({
        success: true,
        review
      });
    }

  } catch (e: any) {
    console.error("Peer review POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/assignments/[id]/peer-review
 * Update assignment peer review settings (instructor only)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) return createAuthResponse("Forbidden", 403);

    const serviceSupabase = createServiceSupabaseClient();
    const body = await request.json();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.peer_review_enabled !== undefined) {
      updateData.peer_review_enabled = body.peer_review_enabled;
    }
    if (body.peer_reviews_required !== undefined) {
      updateData.peer_reviews_required = body.peer_reviews_required;
    }
    if (body.peer_review_due_date !== undefined) {
      updateData.peer_review_due_date = body.peer_review_due_date;
    }
    if (body.peer_review_anonymous !== undefined) {
      updateData.peer_review_anonymous = body.peer_review_anonymous;
    }
    if (body.peer_review_rubric !== undefined) {
      updateData.peer_review_rubric = body.peer_review_rubric;
    }

    const { data: assignment, error } = await serviceSupabase
      .from("assignments")
      .update(updateData)
      .eq("id", assignmentId)
      .select()
      .single();

    if (error) {
      console.error("Error updating peer review settings:", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({ assignment });

  } catch (e: any) {
    console.error("Peer review PUT error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
