import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { validateCourseShare } from '@/lib/share-validation';

/**
 * GET /api/shared-courses/[id]/lessons
 * Get lesson content for a shared course (id = course_shares.id)
 * Reads content from source tenant, progress from student's tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id: shareId } = await params;
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lesson_id');

    // Validate share using centralized validation (enforces revocation)
    const shareValidation = await validateCourseShare(shareId, tenantId);
    if (!shareValidation.valid) {
      return NextResponse.json({ error: shareValidation.error }, { status: 404 });
    }

    const share = shareValidation.share!;

    // Verify enrollment (unless view_only permission or staff)
    const { data: enrollment } = await tq
      .from('cross_tenant_enrollments')
      .select('id, status')
      .eq('source_course_id', share.course_id)
      .eq('student_id', authResult.user.id)
      .eq('status', 'active')
      .single();

    if (!enrollment && share.permission === 'enroll') {
      // Check if user is staff (admins can browse without enrolling)
      const isStaff = ['admin', 'super_admin', 'tenant_admin', 'instructor'].includes(
        authResult.userProfile.role
      );
      if (!isStaff) {
        return NextResponse.json({ error: 'You must enroll to access lesson content' }, { status: 403 });
      }
    }

    // If specific lesson requested, get full content
    if (lessonId) {
      const { data: lesson, error: lessonError } = await tq.raw
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .eq('course_id', share.course_id)
        .single();

      if (lessonError || !lesson) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }

      // Get progress for this lesson
      let progress = null;
      if (enrollment) {
        const { data: lessonProgress } = await tq
          .from('cross_tenant_lesson_progress')
          .select('*')
          .eq('enrollment_id', enrollment.id)
          .eq('lesson_id', lessonId)
          .single();

        progress = lessonProgress;
      }

      return NextResponse.json({ lesson, progress });
    }

    // Otherwise return all lessons (list view, published only)
    const { data: lessons } = await tq.raw
      .from('lessons')
      .select('id, title, description, order, estimated_time, content_type, published, section_id, difficulty, prerequisite_lesson_id')
      .eq('course_id', share.course_id)
      .eq('published', true)
      .order('order', { ascending: true });

    // Get all progress for enrolled user
    const progressMap: Record<string, { completed: boolean; last_accessed_at: string | null }> = {};
    if (enrollment) {
      const { data: allProgress } = await tq
        .from('cross_tenant_lesson_progress')
        .select('lesson_id, completed, last_accessed_at')
        .eq('enrollment_id', enrollment.id);

      if (allProgress) {
        for (const p of allProgress) {
          progressMap[p.lesson_id] = {
            completed: p.completed,
            last_accessed_at: p.last_accessed_at,
          };
        }
      }
    }

    return NextResponse.json({
      lessons: (lessons || []).map(l => ({
        ...l,
        completed: progressMap[l.id]?.completed || false,
        last_accessed_at: progressMap[l.id]?.last_accessed_at || null,
      })),
    });
  } catch (error) {
    console.error('Error in shared course lessons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
