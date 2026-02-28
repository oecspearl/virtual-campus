/**
 * Enhanced Risk Detection Algorithm
 * Calculates comprehensive risk scores for students based on multiple factors
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface RiskFactors {
  assignment_submission_rate: number; // 0-100
  quiz_performance_trend: number; // -100 to 100 (negative = declining)
  login_frequency: number; // Days since last login
  time_spent_on_platform: number; // Hours per week
  discussion_participation: number; // Number of posts/replies
  grade_trajectory: number; // -100 to 100 (negative = declining)
  missing_assignments_count: number;
  late_submissions_count: number;
  quiz_attempts_count: number;
  average_quiz_score: number;
  last_activity_days_ago: number;
}

export interface RiskScore {
  student_id: string;
  course_id?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number; // 0-100
  factors: RiskFactors;
  calculated_at: Date;
}

/**
 * Calculate comprehensive risk score for a student
 */
export async function calculateRiskScore(
  studentId: string,
  courseId?: string
): Promise<RiskScore> {
  const supabase = createServiceSupabaseClient();
  const factors: RiskFactors = {
    assignment_submission_rate: 0,
    quiz_performance_trend: 0,
    login_frequency: 0,
    time_spent_on_platform: 0,
    discussion_participation: 0,
    grade_trajectory: 0,
    missing_assignments_count: 0,
    late_submissions_count: 0,
    quiz_attempts_count: 0,
    average_quiz_score: 0,
    last_activity_days_ago: 0,
  };

  // Get course assignments
  let assignmentQuery = supabase
    .from('assignments')
    .select('id, due_date, course_id');
  
  if (courseId) {
    assignmentQuery = assignmentQuery.eq('course_id', courseId);
  }

  const { data: assignments } = await assignmentQuery;

  // Get assignment submissions
  if (assignments && assignments.length > 0) {
    const assignmentIds = assignments.map(a => a.id);
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, submitted_at, late, status')
      .eq('student_id', studentId)
      .in('assignment_id', assignmentIds);

    const totalAssignments = assignments.length;
    const submittedAssignments = submissions?.filter(s => s.status === 'submitted' || s.status === 'graded') || [];
    const lateSubmissions = submissions?.filter(s => s.late === true) || [];
    const missingAssignments = totalAssignments - submittedAssignments.length;

    factors.assignment_submission_rate = totalAssignments > 0
      ? (submittedAssignments.length / totalAssignments) * 100
      : 100;
    factors.late_submissions_count = lateSubmissions.length;
    factors.missing_assignments_count = missingAssignments;
  }

  // Get quiz attempts and performance
  let quizQuery = supabase
    .from('quizzes')
    .select('id, course_id');
  
  if (courseId) {
    quizQuery = quizQuery.eq('course_id', courseId);
  }

  const { data: quizzes } = await quizQuery;

  if (quizzes && quizzes.length > 0) {
    const quizIds = quizzes.map(q => q.id);
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('quiz_id, percentage, submitted_at')
      .eq('student_id', studentId)
      .in('quiz_id', quizIds)
      .eq('status', 'graded')
      .order('submitted_at', { ascending: false });

    factors.quiz_attempts_count = attempts?.length || 0;

    if (attempts && attempts.length > 0) {
      const scores = attempts.map(a => a.percentage || 0);
      factors.average_quiz_score = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Calculate performance trend (compare first half vs second half)
      if (attempts.length >= 4) {
        const midpoint = Math.floor(attempts.length / 2);
        const firstHalf = attempts.slice(0, midpoint);
        const secondHalf = attempts.slice(midpoint);

        const firstHalfAvg = firstHalf.reduce((sum, a) => sum + (a.percentage || 0), 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, a) => sum + (a.percentage || 0), 0) / secondHalf.length;

        factors.quiz_performance_trend = secondHalfAvg - firstHalfAvg;
      }
    }
  }

  // Get lesson progress and time spent
  let progressQuery = supabase
    .from('lesson_progress')
    .select('time_spent_seconds, last_accessed_at, course_id')
    .eq('student_id', studentId);
  
  if (courseId) {
    progressQuery = progressQuery.eq('course_id', courseId);
  }

  const { data: progressData } = await progressQuery;

  if (progressData && progressData.length > 0) {
    const totalSeconds = progressData.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
    factors.time_spent_on_platform = totalSeconds / 3600; // Convert to hours

    // Get most recent activity
    const lastAccessed = progressData
      .map(p => p.last_accessed_at)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    if (lastAccessed) {
      const daysSince = (Date.now() - new Date(lastAccessed).getTime()) / (1000 * 60 * 60 * 24);
      factors.last_activity_days_ago = Math.floor(daysSince);
    }
  }

  // Get login frequency (using activity logs if available)
  // For now, use last_activity_days_ago as proxy
  factors.login_frequency = factors.last_activity_days_ago;

  // Get discussion participation (if discussions table exists)
  try {
    const { data: discussions } = await supabase
      .from('course_discussions')
      .select('id')
      .eq('author_id', studentId);
    
    if (courseId) {
      // Filter by course if course discussions have course_id
      // This depends on your schema
    }

    factors.discussion_participation = discussions?.length || 0;
  } catch (error) {
    // Table might not exist, set to 0
    factors.discussion_participation = 0;
  }

  // Calculate grade trajectory (if gradebook data available)
  try {
    const { data: grades } = await supabase
      .from('grades')
      .select('percentage, graded_at')
      .eq('student_id', studentId)
      .order('graded_at', { ascending: true });

    if (grades && grades.length >= 4) {
      const midpoint = Math.floor(grades.length / 2);
      const firstHalf = grades.slice(0, midpoint);
      const secondHalf = grades.slice(midpoint);

      const firstHalfAvg = firstHalf.reduce((sum, g) => sum + (g.percentage || 0), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, g) => sum + (g.percentage || 0), 0) / secondHalf.length;

      factors.grade_trajectory = secondHalfAvg - firstHalfAvg;
    }
  } catch (error) {
    // Grade trajectory calculation failed
    factors.grade_trajectory = 0;
  }

  // Calculate risk score (0-100)
  let riskScore = 0;

  // Assignment submission rate (0-25 points)
  if (factors.assignment_submission_rate < 50) riskScore += 25;
  else if (factors.assignment_submission_rate < 70) riskScore += 15;
  else if (factors.assignment_submission_rate < 85) riskScore += 8;

  // Quiz performance trend (0-20 points)
  if (factors.quiz_performance_trend < -20) riskScore += 20;
  else if (factors.quiz_performance_trend < -10) riskScore += 12;
  else if (factors.quiz_performance_trend < 0) riskScore += 6;

  // Login frequency (0-15 points)
  if (factors.login_frequency > 14) riskScore += 15;
  else if (factors.login_frequency > 7) riskScore += 10;
  else if (factors.login_frequency > 3) riskScore += 5;

  // Time spent (0-10 points)
  if (factors.time_spent_on_platform < 1) riskScore += 10;
  else if (factors.time_spent_on_platform < 3) riskScore += 6;
  else if (factors.time_spent_on_platform < 5) riskScore += 3;

  // Missing assignments (0-15 points)
  if (factors.missing_assignments_count > 3) riskScore += 15;
  else if (factors.missing_assignments_count > 1) riskScore += 10;
  else if (factors.missing_assignments_count > 0) riskScore += 5;

  // Late submissions (0-10 points)
  if (factors.late_submissions_count > 2) riskScore += 10;
  else if (factors.late_submissions_count > 0) riskScore += 5;

  // Grade trajectory (0-5 points)
  if (factors.grade_trajectory < -15) riskScore += 5;
  else if (factors.grade_trajectory < -5) riskScore += 3;

  // Ensure score is between 0-100
  riskScore = Math.min(100, Math.max(0, riskScore));

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore >= 76) {
    riskLevel = 'critical';
  } else if (riskScore >= 51) {
    riskLevel = 'high';
  } else if (riskScore >= 26) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  const riskScoreData: RiskScore = {
    student_id: studentId,
    course_id: courseId,
    risk_level: riskLevel,
    risk_score: Math.round(riskScore * 100) / 100,
    factors,
    calculated_at: new Date(),
  };

  // Store in database
  await supabase
    .from('student_risk_scores')
    .insert({
      student_id: studentId,
      course_id: courseId || null,
      risk_level: riskLevel,
      risk_score: riskScoreData.risk_score,
      factors: factors as any,
      calculated_at: riskScoreData.calculated_at.toISOString(),
    });

  return riskScoreData;
}

/**
 * Get at-risk students
 */
export async function getAtRiskStudents(
  courseId?: string,
  riskLevel?: 'medium' | 'high' | 'critical'
): Promise<RiskScore[]> {
  const supabase = createServiceSupabaseClient();

  let query = supabase
    .from('student_risk_scores')
    .select('*')
    .order('calculated_at', { ascending: false });

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

  // Get most recent risk score per student
  const { data } = await query;

  if (!data) return [];

  // Group by student_id and course_id, take most recent
  const latestScores = new Map<string, any>();
  for (const score of data) {
    const key = `${score.student_id}-${score.course_id || 'all'}`;
    if (!latestScores.has(key)) {
      latestScores.set(key, score);
    } else {
      const existing = latestScores.get(key);
      if (new Date(score.calculated_at) > new Date(existing.calculated_at)) {
        latestScores.set(key, score);
      }
    }
  }

  return Array.from(latestScores.values()).map(item => ({
    student_id: item.student_id,
    course_id: item.course_id,
    risk_level: item.risk_level,
    risk_score: item.risk_score,
    factors: item.factors,
    calculated_at: new Date(item.calculated_at),
  }));
}


