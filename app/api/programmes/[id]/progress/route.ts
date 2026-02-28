import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/programmes/[id]/progress
 * Get detailed progress for a student in a programme
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const isStaff = ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    // Use provided student_id if staff, otherwise use current user
    const targetStudentId = isStaff && studentId ? studentId : userProfile.id;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get programme details with courses
    const { data: programme, error: programmeError } = await tq
      .from('programmes')
      .select(`
        id,
        title,
        passing_score,
        programme_courses(
          course_id,
          order,
          weight,
          is_required,
          course:course_id(id, title, thumbnail)
        )
      `)
      .eq('id', programmeId)
      .single();

    if (programmeError || !programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Get programme enrollment
    const { data: enrollment } = await tq
      .from('programme_enrollments')
      .select('*')
      .eq('programme_id', programmeId)
      .eq('student_id', targetStudentId)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this programme' }, { status: 404 });
    }

    // Get course enrollments and progress
    const courseIds = programme.programme_courses?.map((pc: any) => pc.course_id) || [];

    const { data: courseEnrollments } = await tq
      .from('enrollments')
      .select('course_id, status, progress_percentage, completed_at')
      .eq('student_id', targetStudentId)
      .in('course_id', courseIds);

    // Get course grades
    const { data: courseGrades } = await tq
      .from('course_grades')
      .select('course_id, score')
      .eq('student_id', targetStudentId)
      .in('course_id', courseIds);

    // Build course progress map
    const enrollmentMap: Record<string, any> = {};
    courseEnrollments?.forEach(e => {
      enrollmentMap[e.course_id] = e;
    });

    const gradeMap: Record<string, number[]> = {};
    courseGrades?.forEach(g => {
      if (!gradeMap[g.course_id]) gradeMap[g.course_id] = [];
      gradeMap[g.course_id].push(g.score);
    });

    // Calculate progress for each course
    let totalWeight = 0;
    let weightedScore = 0;
    let completedRequired = 0;
    let totalRequired = 0;

    const courseProgress = programme.programme_courses?.map((pc: any) => {
      const enrollment = enrollmentMap[pc.course_id];
      const grades = gradeMap[pc.course_id] || [];
      const avgGrade = grades.length > 0
        ? grades.reduce((a, b) => a + b, 0) / grades.length
        : null;

      const isCompleted = enrollment?.status === 'completed' || enrollment?.progress_percentage >= 100;
      const score = avgGrade ?? enrollment?.progress_percentage ?? 0;

      if (pc.is_required) {
        totalRequired++;
        if (isCompleted) completedRequired++;
      }

      if (score > 0) {
        totalWeight += pc.weight;
        weightedScore += score * pc.weight;
      }

      return {
        course_id: pc.course_id,
        course: pc.course,
        order: pc.order,
        weight: pc.weight,
        is_required: pc.is_required,
        is_completed: isCompleted,
        progress_percentage: enrollment?.progress_percentage || 0,
        grade: avgGrade,
        effective_score: score
      };
    }).sort((a: any, b: any) => a.order - b.order) || [];

    // Calculate overall progress
    const overallScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) / 100 : null;
    const overallProgress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
    const isPassing = overallScore !== null && overallScore >= programme.passing_score;
    const isComplete = completedRequired >= totalRequired;

    return NextResponse.json({
      programme: {
        id: programme.id,
        title: programme.title,
        passing_score: programme.passing_score
      },
      enrollment: {
        ...enrollment,
        final_score: overallScore
      },
      courses: courseProgress,
      summary: {
        total_courses: courseProgress.length,
        completed_courses: courseProgress.filter((c: any) => c.is_completed).length,
        required_courses: totalRequired,
        completed_required: completedRequired,
        overall_progress: overallProgress,
        weighted_score: overallScore,
        is_complete: isComplete,
        is_passing: isPassing
      }
    });
  } catch (error) {
    console.error('Programme progress GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/programmes/[id]/progress
 * Recalculate and update programme progress (admin/system use)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const body = await request.json();
    const studentId = body.student_id || userProfile.id;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get programme
    const { data: programme } = await tq
      .from('programmes')
      .select('id, passing_score')
      .eq('id', programmeId)
      .single();

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Calculate score using database function
    const { data: scoreResult } = await tq.raw
      .rpc('calculate_programme_score', {
        p_programme_id: programmeId,
        p_student_id: studentId
      });

    // Check completion
    const { data: completionResult } = await tq.raw
      .rpc('check_programme_completion', {
        p_programme_id: programmeId,
        p_student_id: studentId
      });

    const isComplete = completionResult === true;
    const isPassing = scoreResult !== null && scoreResult >= programme.passing_score;

    // Update enrollment
    const updateData: any = {
      final_score: scoreResult,
      updated_at: new Date().toISOString()
    };

    if (isComplete && isPassing) {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updatedEnrollment, error } = await tq
      .from('programme_enrollments')
      .update(updateData)
      .eq('programme_id', programmeId)
      .eq('student_id', studentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating programme progress:', error);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json({
      enrollment: updatedEnrollment,
      calculated_score: scoreResult,
      is_complete: isComplete,
      is_passing: isPassing
    });
  } catch (error) {
    console.error('Programme progress POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
