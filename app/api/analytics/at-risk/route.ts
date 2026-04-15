/**
 * At-Risk Students API
 * Get students at risk of failing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAtRiskStudents, calculateStudentRisk } from '@/lib/analytics/risk-prediction';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only instructors and admins can view at-risk students
    if (!hasRole(authResult.userProfile?.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('course_id');
    const riskLevel = searchParams.get('risk_level') as 'medium' | 'high' | 'critical' | null;

    const atRiskStudents = await getAtRiskStudents(
      courseId || undefined,
      riskLevel || undefined
    );

    return NextResponse.json(atRiskStudents);
  } catch (error: any) {
    console.error('At-risk students error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile?.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, course_id } = body;

    if (!student_id) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
    }

    const riskPrediction = await calculateStudentRisk(student_id, course_id);

    return NextResponse.json(riskPrediction);
  } catch (error: any) {
    console.error('Risk calculation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

