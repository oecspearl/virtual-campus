import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/student/programmes
 * Get enrolled programmes for the current student with progress
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get student's programme enrollments
    const { data: enrollments, error } = await tq
      .from('programme_enrollments')
      .select(`
        id,
        status,
        enrolled_at,
        final_score,
        completed_at,
        programme:programme_id (
          id,
          title,
          slug,
          description,
          thumbnail,
          difficulty,
          estimated_duration,
          passing_score
        )
      `)
      .eq('student_id', userProfile.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching student programmes:', error);
      return NextResponse.json({ error: 'Failed to fetch programmes' }, { status: 500 });
    }

    // Get progress for each programme
    const programmesWithProgress = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        const programme = enrollment.programme as any;
        if (!programme) return null;

        // Get programme courses
        const { data: programmeCourses } = await tq
          .from('programme_courses')
          .select('course_id, is_required')
          .eq('programme_id', programme.id);

        const courseIds = programmeCourses?.map(pc => pc.course_id) || [];
        const requiredCount = programmeCourses?.filter(pc => pc.is_required).length || 0;

        // Get student's course enrollments for these courses
        const { data: courseEnrollments } = await tq
          .from('enrollments')
          .select('course_id, status, progress, grade')
          .eq('student_id', userProfile.id)
          .in('course_id', courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']);

        const completedCourses = courseEnrollments?.filter(e => e.status === 'completed').length || 0;
        const totalCourses = courseIds.length;

        // Calculate overall progress
        const overallProgress = totalCourses > 0
          ? Math.round((completedCourses / totalCourses) * 100)
          : 0;

        return {
          id: enrollment.id,
          status: enrollment.status,
          enrolled_at: enrollment.enrolled_at,
          final_score: enrollment.final_score,
          completed_at: enrollment.completed_at,
          programme: {
            ...programme,
            course_count: totalCourses,
            required_count: requiredCount
          },
          progress: {
            completed_courses: completedCourses,
            total_courses: totalCourses,
            overall_progress: overallProgress
          }
        };
      })
    );

    return NextResponse.json({
      programmes: programmesWithProgress.filter(Boolean)
    });
  } catch (error) {
    console.error('Student programmes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
