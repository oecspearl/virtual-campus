import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courseId = id;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile, user } = authResult;

    // Check if user has instructor/admin privileges
    const isAdmin = hasRole(userProfile.role, ['admin', 'super_admin', 'curriculum_designer']);
    
    let hasAccess = isAdmin;

    // If not admin, check if user is a course instructor
    if (!hasAccess) {
      const supabase = await createServerSupabaseClient();
      const { data: courseInstructor } = await supabase
        .from('course_instructors')
        .select('id')
        .eq('course_id', courseId)
        .eq('instructor_id', user.id)
        .single();

      hasAccess = !!courseInstructor;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const serviceSupabase = await createServerSupabaseClient();

    // Delete all active and suspended enrollments for this course
    const { data, error } = await serviceSupabase
      .from('enrollments')
      .delete()
      .eq('course_id', courseId)
      .in('status', ['active', 'suspended'])
      .select('id');

    if (error) {
      console.error('Error deleting all participants:', error);
      return NextResponse.json({ 
        error: 'Failed to delete all participants',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'All participants successfully deleted',
      deletedCount: data?.length || 0
    });

  } catch (error) {
    console.error('Delete all participants error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}

