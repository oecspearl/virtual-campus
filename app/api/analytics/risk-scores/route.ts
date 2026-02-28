import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { calculateRiskScore, getAtRiskStudents } from '@/lib/analytics/risk-detection';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/analytics/risk-scores
 * Get risk scores for students
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'student';

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const courseId = searchParams.get('course_id');
    const riskLevel = searchParams.get('risk_level') as 'medium' | 'high' | 'critical' | null;
    const calculate = searchParams.get('calculate') === 'true';

    // Students can only view their own risk scores
    if (userRole === 'student' && studentId && studentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If calculate is true, calculate new risk score
    if (calculate && studentId) {
      if (userRole === 'student' && studentId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const riskScore = await calculateRiskScore(
        studentId,
        courseId || undefined
      );

      return NextResponse.json({ data: riskScore });
    }

    // Get existing risk scores
    if (studentId) {
      // Get specific student's risk scores
      let query = supabase
        .from('student_risk_scores')
        .select('*')
        .eq('student_id', studentId)
        .order('calculated_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data: data || [] });
    }

    // Get at-risk students (instructors and admins only)
    if (!hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const atRiskStudents = await getAtRiskStudents(
      courseId || undefined,
      riskLevel || undefined
    );

    return NextResponse.json({ data: atRiskStudents });
  } catch (error: any) {
    console.error('Error in risk-scores API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/risk-scores
 * Calculate and store risk score for a student
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'student';

    // Only instructors and admins can trigger calculations
    if (!hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, course_id } = body;

    if (!student_id) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
    }

    const riskScore = await calculateRiskScore(student_id, course_id);

    return NextResponse.json({ data: riskScore });
  } catch (error: any) {
    console.error('Error in risk-scores POST API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


