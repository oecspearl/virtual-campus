import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole, cleanupStudentCourseData } from "@/lib/database-helpers";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get all enrollments with course details (using denormalized data)
    const { data: enrollments, error: enrollmentsError } = await tq
      .from('enrollments')
      .select(`
        id,
        course_id,
        student_id,
        enrolled_at,
        status,
        progress_percentage,
        completed_at,
        updated_at,
        student_name,
        student_email,
        student_role,
        student_bio,
        student_avatar,
        learning_preferences,
        user_created_at,
        profile_created_at,
        courses (
          id,
          title,
          description,
          published
        )
      `)
      .order('enrolled_at', { ascending: false });

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
    }

    return NextResponse.json({ enrollments: enrollments || [] });

  } catch (error) {
    console.error('Admin enrollments GET API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { course_id, student_id, status = 'active' } = await request.json();

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    if (!course_id || !student_id) {
      return NextResponse.json({ error: "Course ID and Student ID are required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if enrollment already exists
    const { data: existingEnrollment, error: existingError } = await tq
      .from('enrollments')
      .select('id, status')
      .eq('course_id', course_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing enrollment:', existingError);
      return NextResponse.json({ error: "Failed to check existing enrollment" }, { status: 500 });
    }

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return NextResponse.json({ 
          message: "User is already enrolled in this course",
          enrollment: existingEnrollment 
        });
      } else {
        // Get user information for denormalization
        const { data: user, error: userError } = await tq
          .from('users')
          .select('id, name, email, role, created_at')
          .eq('id', student_id)
          .single();

        if (userError || !user) {
          console.error('Error fetching user:', userError);
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get user profile information for denormalization
        const { data: userProfileData } = await tq
          .from('user_profiles')
          .select('bio, avatar, learning_preferences, created_at')
          .eq('user_id', student_id)
          .single();

        // Reactivate enrollment with updated user information
        const { data: updatedEnrollment, error: updateError } = await tq
          .from('enrollments')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
            student_name: user.name,
            student_email: user.email,
            student_role: user.role,
            student_bio: userProfileData?.bio || null,
            student_avatar: userProfileData?.avatar || null,
            learning_preferences: userProfileData?.learning_preferences || {},
            user_created_at: user.created_at,
            profile_created_at: userProfileData?.created_at || null
          })
          .eq('id', existingEnrollment.id)
          .select(`
            id,
            student_id,
            status,
            enrolled_at,
            progress_percentage,
            completed_at,
            student_name,
            student_email,
            student_role,
            student_bio,
            student_avatar,
            learning_preferences,
            user_created_at,
            profile_created_at,
            updated_at
          `)
          .single();

        if (updateError) {
          console.error('Error reactivating enrollment:', updateError);
          return NextResponse.json({ error: "Failed to reactivate enrollment" }, { status: 500 });
        }

        return NextResponse.json({ 
          message: "Enrollment reactivated successfully",
          enrollment: updatedEnrollment 
        });
      }
    }

    // Get user information for denormalization
    const { data: user, error: userError } = await tq
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', student_id)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user profile information for denormalization
    const { data: userProfileData } = await tq
      .from('user_profiles')
      .select('bio, avatar, learning_preferences, created_at')
      .eq('user_id', student_id)
      .single();

    // Create new enrollment with denormalized user information
    const enrollmentData = {
      course_id,
      student_id,
      status,
      enrolled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      student_name: user.name,
      student_email: user.email,
      student_role: user.role,
      student_bio: userProfileData?.bio || null,
      student_avatar: userProfileData?.avatar || null,
      learning_preferences: userProfileData?.learning_preferences || {},
      user_created_at: user.created_at,
      profile_created_at: userProfileData?.created_at || null
    };

    const { data: newEnrollment, error: insertError } = await tq
      .from('enrollments')
      .insert([enrollmentData])
      .select(`
        id,
        student_id,
        status,
        enrolled_at,
        progress_percentage,
        completed_at,
        student_name,
        student_email,
        student_role,
        student_bio,
        student_avatar,
        learning_preferences,
        user_created_at,
        profile_created_at,
        updated_at
      `)
      .single();

    if (insertError) {
      console.error('Error creating enrollment:', insertError);
      return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Enrollment created successfully",
      enrollment: newEnrollment
    });

  } catch (error) {
    console.error('Admin enrollments POST API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/enrollments
 * Remove a student from a course (admin only)
 * Query: ?course_id=xxx&student_id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const studentId = searchParams.get('student_id');

    if (!courseId || !studentId) {
      return NextResponse.json({
        error: "course_id and student_id are required"
      }, { status: 400 });
    }

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Find the enrollment
    const { data: enrollment, error: findError } = await tq
      .from('enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .single();

    if (findError || !enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    // Update status to 'dropped' instead of deleting
    const { error: updateError } = await tq
      .from('enrollments')
      .update({
        status: 'dropped',
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id);

    if (updateError) {
      console.error('Error removing enrollment:', updateError);
      return NextResponse.json({ error: "Failed to remove enrollment" }, { status: 500 });
    }

    // Clean up student's todos, calendar events, notes, and bookmarks for this course
    const cleanup = await cleanupStudentCourseData(tq.raw, studentId, courseId);

    return NextResponse.json({
      success: true,
      message: "Student removed from course",
      cleanup
    });

  } catch (error) {
    console.error('Admin enrollments DELETE API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
