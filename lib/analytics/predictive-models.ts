/**
 * Predictive Analytics Models
 * Various predictive models for course completion, grades, and dropout risk
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { calculateRiskScore } from './risk-detection';

export interface CompletionPrediction {
  student_id: string;
  course_id: string;
  completion_probability: number; // 0-100
  predicted_completion_date?: Date;
  confidence: number; // 0-100
}

export interface GradePrediction {
  student_id: string;
  course_id: string;
  predicted_grade: string; // A, B, C, D, F
  predicted_percentage: number; // 0-100
  confidence: number; // 0-100
}

export interface DropoutPrediction {
  student_id: string;
  course_id: string;
  dropout_probability: number; // 0-100
  risk_factors: string[];
  confidence: number; // 0-100
}

export interface InterventionEffectiveness {
  intervention_type: string;
  success_rate: number; // 0-100
  students_affected: number;
  average_improvement: number; // Percentage points
}

/**
 * Predict course completion probability
 */
export async function predictCourseCompletion(
  studentId: string,
  courseId: string
): Promise<CompletionPrediction> {
  const supabase = createServiceSupabaseClient();

  // Get enrollment data
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('enrolled_at, progress_percentage, course_id')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .single();

  if (!enrollment) {
    throw new Error('Student not enrolled in course');
  }

  // Get course data
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  // Get student progress
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('status, completed_at, course_id')
    .eq('student_id', studentId)
    .eq('course_id', courseId);

  const completedLessons = progress?.filter(p => p.status === 'completed').length || 0;
  const totalLessons = progress?.length || 1;
  const completionRate = (completedLessons / totalLessons) * 100;

  // Get risk score
  const riskScore = await calculateRiskScore(studentId, courseId);

  // Calculate completion probability
  // Base probability from current progress
  let completionProbability = enrollment.progress_percentage || 0;

  // Adjust based on risk factors
  if (riskScore.risk_level === 'critical') {
    completionProbability *= 0.5;
  } else if (riskScore.risk_level === 'high') {
    completionProbability *= 0.7;
  } else if (riskScore.risk_level === 'medium') {
    completionProbability *= 0.85;
  }

  // Adjust based on assignment submission rate
  const submissionRate = riskScore.factors.assignment_submission_rate;
  completionProbability = completionProbability * (submissionRate / 100);

  // Adjust based on quiz performance
  const quizScore = riskScore.factors.average_quiz_score;
  if (quizScore > 0) {
    completionProbability = completionProbability * (quizScore / 100);
  }

  // Ensure probability is between 0-100
  completionProbability = Math.min(100, Math.max(0, completionProbability));

  // Calculate confidence (based on data availability)
  let confidence = 50; // Base confidence
  if (progress && progress.length > 5) confidence += 20;
  if (submissionRate > 0) confidence += 15;
  if (quizScore > 0) confidence += 15;
  confidence = Math.min(100, confidence);

  // Predict completion date (rough estimate)
  const daysSinceEnrollment = (Date.now() - new Date(enrollment.enrolled_at).getTime()) / (1000 * 60 * 60 * 24);
  const progressPerDay = enrollment.progress_percentage / daysSinceEnrollment;
  const remainingProgress = 100 - enrollment.progress_percentage;
  const daysToComplete = progressPerDay > 0 ? remainingProgress / progressPerDay : null;

  const predictedCompletionDate = daysToComplete
    ? new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000)
    : undefined;

  return {
    student_id: studentId,
    course_id: courseId,
    completion_probability: Math.round(completionProbability * 100) / 100,
    predicted_completion_date: predictedCompletionDate,
    confidence: Math.round(confidence),
  };
}

/**
 * Predict final grade
 */
export async function predictGrade(
  studentId: string,
  courseId: string
): Promise<GradePrediction> {
  const supabase = createServiceSupabaseClient();

  // Get all grades
  const { data: grades } = await supabase
    .from('grades')
    .select('percentage, graded_at')
    .eq('student_id', studentId)
    .order('graded_at', { ascending: true });

  // Get quiz scores
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id')
    .eq('course_id', courseId);

  const quizIds = quizzes?.map(q => q.id) || [];
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('percentage')
    .eq('student_id', studentId)
    .in('quiz_id', quizIds)
    .eq('status', 'graded');

  // Get assignment grades
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, points')
    .eq('course_id', courseId);

  const assignmentIds = assignments?.map(a => a.id) || [];
  const { data: assignmentSubmissions } = await supabase
    .from('assignment_submissions')
    .select('grade, assignment_id')
    .eq('student_id', studentId)
    .in('assignment_id', assignmentIds)
    .eq('status', 'graded');

  // Calculate weighted average
  const allScores: number[] = [];
  
  // Add grade percentages
  if (grades) {
    grades.forEach(g => {
      if (g.percentage) allScores.push(g.percentage);
    });
  }

  // Add quiz percentages
  if (quizAttempts) {
    quizAttempts.forEach(q => {
      if (q.percentage) allScores.push(q.percentage);
    });
  }

  // Add assignment percentages
  if (assignmentSubmissions && assignments) {
    assignmentSubmissions.forEach(sub => {
      const assignment = assignments.find(a => a.id === sub.assignment_id);
      if (assignment && sub.grade && assignment.points) {
        const percentage = (sub.grade / assignment.points) * 100;
        allScores.push(percentage);
      }
    });
  }

  // Calculate average
  const averageScore = allScores.length > 0
    ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
    : 0;

  // Get risk score for trend adjustment
  const riskScore = await calculateRiskScore(studentId, courseId);
  const trend = riskScore.factors.grade_trajectory;

  // Adjust prediction based on trend
  let predictedPercentage = averageScore;
  if (trend < 0) {
    // Declining trend, reduce prediction
    predictedPercentage = averageScore + (trend * 0.5);
  } else {
    // Improving trend, increase prediction slightly
    predictedPercentage = averageScore + (trend * 0.3);
  }

  // Ensure percentage is between 0-100
  predictedPercentage = Math.min(100, Math.max(0, predictedPercentage));

  // Convert to letter grade
  let predictedGrade: string;
  if (predictedPercentage >= 90) predictedGrade = 'A';
  else if (predictedPercentage >= 80) predictedGrade = 'B';
  else if (predictedPercentage >= 70) predictedGrade = 'C';
  else if (predictedPercentage >= 60) predictedGrade = 'D';
  else predictedGrade = 'F';

  // Calculate confidence
  let confidence = 30; // Base confidence
  if (allScores.length > 10) confidence += 30;
  else if (allScores.length > 5) confidence += 20;
  else if (allScores.length > 0) confidence += 10;

  if (grades && grades.length > 0) confidence += 20;
  if (quizAttempts && quizAttempts.length > 0) confidence += 10;
  if (assignmentSubmissions && assignmentSubmissions.length > 0) confidence += 10;

  confidence = Math.min(100, confidence);

  return {
    student_id: studentId,
    course_id: courseId,
    predicted_grade: predictedGrade,
    predicted_percentage: Math.round(predictedPercentage * 100) / 100,
    confidence: Math.round(confidence),
  };
}

/**
 * Predict dropout risk
 */
export async function predictDropout(
  studentId: string,
  courseId: string
): Promise<DropoutPrediction> {
  const riskScore = await calculateRiskScore(studentId, courseId);
  const factors = riskScore.factors;

  // Calculate dropout probability based on risk score
  let dropoutProbability = riskScore.risk_score;

  // Identify risk factors
  const riskFactors: string[] = [];
  if (factors.assignment_submission_rate < 50) {
    riskFactors.push('Low assignment submission rate');
    dropoutProbability += 10;
  }
  if (factors.login_frequency > 7) {
    riskFactors.push('Infrequent logins');
    dropoutProbability += 15;
  }
  if (factors.missing_assignments_count > 2) {
    riskFactors.push('Multiple missing assignments');
    dropoutProbability += 10;
  }
  if (factors.quiz_performance_trend < -15) {
    riskFactors.push('Declining quiz performance');
    dropoutProbability += 8;
  }
  if (factors.time_spent_on_platform < 2) {
    riskFactors.push('Low platform engagement');
    dropoutProbability += 5;
  }

  // Ensure probability is between 0-100
  dropoutProbability = Math.min(100, Math.max(0, dropoutProbability));

  // Calculate confidence
  let confidence = 50;
  if (factors.assignment_submission_rate > 0) confidence += 15;
  if (factors.quiz_attempts_count > 0) confidence += 15;
  if (factors.time_spent_on_platform > 0) confidence += 10;
  confidence = Math.min(100, confidence);

  return {
    student_id: studentId,
    course_id: courseId,
    dropout_probability: Math.round(dropoutProbability * 100) / 100,
    risk_factors: riskFactors,
    confidence: Math.round(confidence),
  };
}

/**
 * Estimate intervention effectiveness
 */
export async function estimateInterventionEffectiveness(
  interventionType: string,
  courseId?: string
): Promise<InterventionEffectiveness> {
  // This would typically use historical data
  // For now, return estimated values based on intervention type
  
  const effectiveness: Record<string, { success_rate: number; improvement: number }> = {
    'email_reminder': { success_rate: 35, improvement: 5 },
    'personalized_message': { success_rate: 50, improvement: 10 },
    'tutoring_session': { success_rate: 70, improvement: 15 },
    'study_group': { success_rate: 60, improvement: 12 },
    'extension_granted': { success_rate: 80, improvement: 8 },
  };

  const defaultEffectiveness = { success_rate: 40, improvement: 7 };
  const intervention = effectiveness[interventionType] || defaultEffectiveness;

  // Get count of students who could benefit
  const supabase = createServiceSupabaseClient();
  let query = supabase
    .from('student_risk_scores')
    .select('student_id', { count: 'exact' })
    .in('risk_level', ['medium', 'high', 'critical']);

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { count } = await query;

  return {
    intervention_type: interventionType,
    success_rate: intervention.success_rate,
    students_affected: count || 0,
    average_improvement: intervention.improvement,
  };
}


