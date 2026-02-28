import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/database-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const { data: course, error } = await tq
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (e: any) {
    console.error('Course GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Check if user has permission to update this course
    // Must be: course instructor or admin
    const { data: course } = await tq
      .from('courses')
      .select('id')
      .eq('id', id)
      .single();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile.role, ["admin", "super_admin", "curriculum_designer"]);

    // Check if user is an instructor for this course
    const { data: instructorCheck } = await tq
      .from('course_instructors')
      .select('id')
      .eq('course_id', id)
      .eq('instructor_id', user.id)
      .single();
    const isInstructor = !!instructorCheck;

    if (!isAdmin && !isInstructor) {
      return NextResponse.json({ error: "You don't have permission to update this course" }, { status: 403 });
    }

    const body = await request.json();

    // Build update object only with provided fields (allows partial updates)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Add fields only if they are provided in the body
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail;
    if (body.grade_level !== undefined) updateData.grade_level = body.grade_level;
    if (body.subject_area !== undefined) updateData.subject_area = body.subject_area;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.modality !== undefined) updateData.modality = body.modality;
    if (body.estimated_duration !== undefined) updateData.estimated_duration = body.estimated_duration;
    if (body.syllabus !== undefined) updateData.syllabus = body.syllabus;
    if (body.published !== undefined) updateData.published = body.published;
    if (body.featured !== undefined) updateData.featured = body.featured;

    // Use tenant query to ensure update works with tenant scoping
    const { data: updatedCourse, error } = await tq
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Course update error:', error);
      return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }
    if (!updatedCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(updatedCourse);
  } catch (e: any) {
    console.error('Course PUT API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    // Only admins can delete courses
    if (!hasRole(userProfile.role, ["admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use tenant query for admin operations
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Verify the course exists
    const { data: course, error: fetchError } = await tq
      .from('courses')
      .select('id, title')
      .eq('id', id)
      .single();

    if (fetchError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Delete related records in order of dependencies
    const deletionOrder = [
      'course_grades',
      'course_grade_items',
      'course_gradebook_settings',
      'quiz_attempts',
      'quizzes',
      'assignments',
      'assignment_submissions',
      'lesson_progress',
      'lessons',
      'subjects',
      'enrollments',
      'course_instructors',
      'course_announcements',
      'course_discussions',
      'discussions',
      'lesson_discussions',
      'classes',
      'resource_links',
      'scorm_tracking',
      'scorm_packages',
      'video_conferences',
      'ai_tutor_analytics',
      'ai_tutor_conversations',
      'user_badges',
      'certificates',
      'ceu_credits',
      'student_activity_log',
    ];

    // Delete related records (ignore errors for tables that might not exist)
    for (const tableName of deletionOrder) {
      try {
        await tq
          .from(tableName)
          .delete()
          .eq('course_id', id);
      } catch {
        // Table might not exist or have different schema, continue
      }
    }

    // Handle tables with ON DELETE SET NULL
    const setNullTables = [
      'student_risk_indicators',
      'learning_analytics_predictions',
      'engagement_metrics',
      'proctoring_sessions',
      'plagiarism_checks',
      'lti_launches',
      'lti_grade_passback',
      'oneroster_classes',
      'files',
    ];

    for (const tableName of setNullTables) {
      try {
        await tq
          .from(tableName)
          .update({ course_id: null })
          .eq('course_id', id);
      } catch {
        // Table might not exist, continue
      }
    }

    // Delete the course
    const { error: deleteError } = await tq
      .from('courses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Course delete error:', deleteError);
      return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Course deleted successfully" });
  } catch (e: any) {
    console.error('Course DELETE API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
