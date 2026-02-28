/**
 * Learning Analytics - Risk Prediction
 * Predicts students at risk of failing
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface RiskFactors {
  low_engagement: boolean;
  poor_performance: boolean;
  missing_assignments: boolean;
  low_attendance: boolean;
  late_submissions: boolean;
  declining_trend: boolean;
}

export interface RiskPrediction {
  student_id: string;
  course_id?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number; // 0-100
  risk_factors: RiskFactors;
  engagement_score: number;
  performance_score: number;
  attendance_rate: number;
  predicted_grade?: string;
  confidence: number;
}

/**
 * Calculate student risk indicators
 */
export async function calculateStudentRisk(
  studentId: string,
  courseId?: string
): Promise<RiskPrediction> {
  const supabase = createServiceSupabaseClient();
  
  // Get student's current performance
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId);
  
  const courseIds = courseId ? [courseId] : (enrollments?.map(e => e.course_id) || []);
  
  // Get engagement metrics
  const { data: engagement } = await supabase
    .from('engagement_metrics')
    .select('*')
    .eq('student_id', studentId)
    .in('course_id', courseIds)
    .order('metric_date', { ascending: false })
    .limit(30)
    .single();
  
  // Get grades
  const { data: grades } = await supabase
    .from('course_grades')
    .select('score, max_score')
    .eq('student_id', studentId)
    .in('course_id', courseIds);
  
  // Get assignments
  const { data: assignments } = await supabase
    .from('assignment_submissions')
    .select('submitted_at, assignment_id, status')
    .eq('student_id', studentId);
  
  // Filter by course if specified
  let filteredAssignments = assignments || [];
  if (courseId) {
    const { data: courseAssignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('course_id', courseId);
    const courseAssignmentIds = courseAssignments?.map(a => a.id) || [];
    filteredAssignments = filteredAssignments.filter(a => 
      courseAssignmentIds.includes(a.assignment_id)
    );
  }
  
  // Calculate metrics
  const engagementScore = engagement?.engagement_score || 0;
  const avgGrade = grades && grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.score / g.max_score * 100), 0) / grades.length
    : 0;
  
  const totalAssignments = filteredAssignments.length;
  const onTimeAssignments = filteredAssignments.filter(a => 
    a.submitted_at && new Date(a.submitted_at) <= new Date()
  ).length;
  const onTimeRate = totalAssignments > 0 ? (onTimeAssignments / totalAssignments) * 100 : 0;
  
  // Identify risk factors
  const riskFactors: RiskFactors = {
    low_engagement: engagementScore < 40,
    poor_performance: avgGrade < 60,
    missing_assignments: onTimeRate < 70,
    low_attendance: false, // Would need attendance data
    late_submissions: onTimeRate < 80 && onTimeRate >= 70,
    declining_trend: false, // Would need historical comparison
  };
  
  // Calculate risk score (0-100)
  let riskScore = 0;
  if (riskFactors.low_engagement) riskScore += 20;
  if (riskFactors.poor_performance) riskScore += 25;
  if (riskFactors.missing_assignments) riskScore += 20;
  if (riskFactors.low_attendance) riskScore += 15;
  if (riskFactors.late_submissions) riskScore += 10;
  if (riskFactors.declining_trend) riskScore += 10;
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore >= 70) {
    riskLevel = 'critical';
  } else if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 30) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // Predict grade
  let predictedGrade: string | undefined;
  if (avgGrade >= 90) predictedGrade = 'A';
  else if (avgGrade >= 80) predictedGrade = 'B';
  else if (avgGrade >= 70) predictedGrade = 'C';
  else if (avgGrade >= 60) predictedGrade = 'D';
  else predictedGrade = 'F';
  
  const prediction: RiskPrediction = {
    student_id: studentId,
    course_id: courseId,
    risk_level: riskLevel,
    risk_score: riskScore,
    risk_factors: riskFactors,
    engagement_score: engagementScore,
    performance_score: avgGrade,
    attendance_rate: 100, // Placeholder
    predicted_grade: predictedGrade,
    confidence: 75, // Placeholder - would be calculated from model accuracy
  };
  
  // Store prediction
  await supabase.from('student_risk_indicators').upsert({
    student_id: studentId,
    course_id: courseId || null,
    risk_level: riskLevel,
    risk_score: riskScore,
    risk_factors: riskFactors,
    engagement_score: engagementScore,
    performance_score: avgGrade,
    attendance_rate: 100,
    predicted_grade: predictedGrade,
    confidence: 75,
    calculated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  }, {
    onConflict: 'student_id,course_id',
  });
  
  return prediction;
}

/**
 * Get at-risk students
 */
export async function getAtRiskStudents(
  courseId?: string,
  riskLevel?: 'medium' | 'high' | 'critical'
): Promise<RiskPrediction[]> {
  const supabase = createServiceSupabaseClient();
  
  let query = supabase
    .from('student_risk_indicators')
    .select('*')
    .gte('expires_at', new Date().toISOString());
  
  if (courseId) {
    query = query.eq('course_id', courseId);
  }
  
  if (riskLevel) {
    const levels = riskLevel === 'medium' 
      ? ['medium', 'high', 'critical']
      : riskLevel === 'high'
      ? ['high', 'critical']
      : ['critical'];
    query = query.in('risk_level', levels);
  } else {
    query = query.in('risk_level', ['medium', 'high', 'critical']);
  }
  
  query = query.order('risk_score', { ascending: false });
  
  const { data } = await query;
  
  return (data || []).map(item => ({
    student_id: item.student_id,
    course_id: item.course_id,
    risk_level: item.risk_level,
    risk_score: item.risk_score,
    risk_factors: item.risk_factors,
    engagement_score: item.engagement_score,
    performance_score: item.performance_score,
    attendance_rate: item.attendance_rate,
    predicted_grade: item.predicted_grade,
    confidence: item.confidence,
  }));
}

