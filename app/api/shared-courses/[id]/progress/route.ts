import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

/**
 * POST /api/shared-courses/[id]/progress
 * Update lesson progress for a shared course enrollment
 * Body: { lesson_id, completed?, time_spent_seconds? }
 */
export async function POST(
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
    const body = await request.json();

    const { lesson_id, completed, time_spent_seconds } = body;

    if (!lesson_id) {
      return NextResponse.json({ error: 'lesson_id is required' }, { status: 400 });
    }

    // Verify share
    const { data: share } = await tq.raw
      .from('course_shares')
      .select('id, course_id')
      .eq('id', shareId)
      .is('revoked_at', null)
      .single();

    if (!share) {
      return NextResponse.json({ error: 'Shared course not found' }, { status: 404 });
    }

    // Verify enrollment
    const { data: enrollment } = await tq
      .from('cross_tenant_enrollments')
      .select('id, source_course_id')
      .eq('source_course_id', share.course_id)
      .eq('student_id', authResult.user.id)
      .eq('status', 'active')
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    // Verify the lesson belongs to the course (read from source tenant)
    const { data: lesson } = await tq.raw
      .from('lessons')
      .select('id')
      .eq('id', lesson_id)
      .eq('course_id', share.course_id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found in this course' }, { status: 404 });
    }

    // Upsert progress record
    const { data: progress, error: progressError } = await tq
      .from('cross_tenant_lesson_progress')
      .upsert({
        enrollment_id: enrollment.id,
        lesson_id,
        student_id: authResult.user.id,
        completed: completed ?? false,
        completed_at: completed ? new Date().toISOString() : null,
        time_spent_seconds: time_spent_seconds || 0,
        last_accessed_at: new Date().toISOString(),
      }, {
        onConflict: 'enrollment_id,lesson_id',
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error updating progress:', progressError);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    // Recalculate overall course progress
    const { count: totalLessons } = await tq.raw
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', share.course_id)
      .eq('published', true);

    const { count: completedLessons } = await tq
      .from('cross_tenant_lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', enrollment.id)
      .eq('completed', true);

    const progressPercentage = totalLessons && totalLessons > 0
      ? Math.round(((completedLessons || 0) / totalLessons) * 100)
      : 0;

    const isCompleted = progressPercentage === 100;

    // Update enrollment progress
    await tq
      .from('cross_tenant_enrollments')
      .update({
        progress_percentage: progressPercentage,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);

    return NextResponse.json({
      progress,
      enrollment_progress: progressPercentage,
      course_completed: isCompleted,
    });
  } catch (error) {
    console.error('Error in shared course progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
