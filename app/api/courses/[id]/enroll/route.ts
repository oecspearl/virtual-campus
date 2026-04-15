import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse, checkRateLimit } from "@/lib/api-auth";
import { cleanupStudentCourseData } from "@/lib/enrollment-cleanup";
import { withIdempotency } from "@/lib/idempotency";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate first (outside idempotency wrapper for rate limiting)
  const authResult = await authenticateUser(request);
  if (!authResult.success) {
    return createAuthResponse(authResult.error!, authResult.status!);
  }

  const { user } = authResult;

  // Rate limit: 5 enrollment attempts per minute
  if (!checkRateLimit(`enroll:${user.id}`, 5, 60000)) {
    return NextResponse.json({ error: 'Too many enrollment attempts. Please try again later.' }, { status: 429 });
  }

  return withIdempotency(request, async () => {
  try {
    const { id } = await params;
    const courseId = id;

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    // Parse optional cohort_id from body
    let cohortId: string | null = null;
    try {
      const body = await request.json();
      cohortId = body.cohort_id || null;
    } catch {
      // No body or invalid JSON — fine, cohort_id is optional
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, published')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (!course.published) {
      return NextResponse.json({ error: "Course is not available for enrollment" }, { status: 400 });
    }

    // Check if user is already enrolled
    const { data: existingEnrollment, error: checkError } = await serviceSupabase
      .from('enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing enrollment:', checkError);
      return NextResponse.json({ error: "Failed to check enrollment status" }, { status: 500 });
    }

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return NextResponse.json({ error: "You are already enrolled in this course" }, { status: 400 });
      } else if (existingEnrollment.status === 'dropped') {
        // Re-enroll the user (also assign to cohort if provided)
        const updateFields: Record<string, any> = {
          status: 'active',
          enrolled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        if (cohortId) {
          updateFields.class_id = cohortId;
        }

        const { error: updateError } = await serviceSupabase
          .from('enrollments')
          .update(updateFields)
          .eq('id', existingEnrollment.id);

        if (updateError) {
          console.error('Error re-enrolling user:', updateError);
          return NextResponse.json({ error: "Failed to re-enroll in course" }, { status: 500 });
        }

        return NextResponse.json({
          message: "Successfully re-enrolled in course",
          enrollment: { id: existingEnrollment.id, status: 'active' }
        });
      }
    }

    // Resolve cohort: use provided cohort_id, or find default cohort for this course
    let resolvedCohortId = cohortId;
    if (!resolvedCohortId) {
      const { data: defaultCohort } = await serviceSupabase
        .from('classes')
        .select('id, max_enrollment, enrollment_open')
        .eq('course_id', courseId)
        .eq('is_default', true)
        .eq('active', true)
        .maybeSingle();

      if (defaultCohort && defaultCohort.enrollment_open) {
        resolvedCohortId = defaultCohort.id;
      }
    }

    // Check cohort capacity if enrolling into a cohort
    if (resolvedCohortId) {
      const { data: cohort } = await serviceSupabase
        .from('classes')
        .select('id, max_enrollment, enrollment_open')
        .eq('id', resolvedCohortId)
        .single();

      if (!cohort) {
        return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
      }

      if (!cohort.enrollment_open) {
        return NextResponse.json({ error: "Enrollment is closed for this cohort" }, { status: 400 });
      }

      if (cohort.max_enrollment) {
        const { count } = await serviceSupabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', resolvedCohortId)
          .eq('status', 'active');

        if (count !== null && count >= cohort.max_enrollment) {
          return NextResponse.json({ error: "This cohort is full" }, { status: 400 });
        }
      }
    }

    // Create new enrollment
    const { data: enrollment, error: enrollError } = await serviceSupabase
      .from('enrollments')
      .insert([{
        course_id: courseId,
        student_id: user.id,
        class_id: resolvedCohortId || null,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id, status, enrolled_at, class_id')
      .single();

    if (enrollError) {
      console.error('Error creating enrollment:', enrollError);
      return NextResponse.json({ error: "Failed to enroll in course" }, { status: 500 });
    }

    // Send enrollment confirmation email
    try {
      const { notifyEnrollment } = await import('@/lib/notifications');
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      await notifyEnrollment(user.id, {
        courseTitle: course.title,
        courseUrl: `${appUrl}/courses/${courseId}`,
      });
    } catch (notifError) {
      // Don't fail enrollment if notification fails
      console.error('Failed to send enrollment notification:', notifError);
    }

    return NextResponse.json({ 
      message: "Successfully enrolled in course",
      enrollment
    });

  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  }); // end withIdempotency
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const { id } = await params;
    const courseId = id;

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Find and update enrollment status to 'dropped'
    const { data: enrollment, error: findError } = await serviceSupabase
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .single();

    if (findError || !enrollment) {
      return NextResponse.json({ error: "No active enrollment found" }, { status: 404 });
    }

    const { error: updateError } = await serviceSupabase
      .from('enrollments')
      .update({
        status: 'dropped',
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id);

    if (updateError) {
      console.error('Error dropping enrollment:', updateError);
      return NextResponse.json({ error: "Failed to drop course" }, { status: 500 });
    }

    // Clean up student's todos, calendar events, notes, and bookmarks for this course
    const cleanup = await cleanupStudentCourseData(serviceSupabase, user.id, courseId);

    return NextResponse.json({
      message: "Successfully dropped course",
      cleanup
    });

  } catch (error) {
    console.error('Drop enrollment error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
