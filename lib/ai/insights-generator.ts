/**
 * AI-Powered Insights Generator
 * Generates actionable insights from learning data
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { calculateRiskScore } from '@/lib/analytics/risk-detection';
import { predictCourseCompletion, predictGrade, predictDropout } from '@/lib/analytics/predictive-models';

export interface Insight {
  insight_type: string;
  entity_type: 'student' | 'course' | 'instructor' | 'system';
  entity_id: string;
  insight: string;
  confidence: number;
  metadata: Record<string, any>;
  is_actionable: boolean;
}

/**
 * Generate insights for a student
 */
export async function generateStudentInsights(studentId: string, courseId?: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const supabase = createServiceSupabaseClient();

  // Get risk score
  const riskScore = await calculateRiskScore(studentId, courseId);

  // Risk-based insights
  if (riskScore.risk_level === 'critical' || riskScore.risk_level === 'high') {
    insights.push({
      insight_type: 'risk_alert',
      entity_type: 'student',
      entity_id: studentId,
      insight: `Student is at ${riskScore.risk_level} risk. Key factors: ${riskScore.factors.missing_assignments_count} missing assignments, ${riskScore.factors.assignment_submission_rate.toFixed(1)}% submission rate.`,
      confidence: 0.85,
      metadata: {
        risk_level: riskScore.risk_level,
        risk_score: riskScore.risk_score,
        factors: riskScore.factors,
      },
      is_actionable: true,
    });
  }

  // Assignment submission insights
  if (riskScore.factors.assignment_submission_rate < 70) {
    insights.push({
      insight_type: 'engagement',
      entity_type: 'student',
      entity_id: studentId,
      insight: `Low assignment submission rate (${riskScore.factors.assignment_submission_rate.toFixed(1)}%). Consider sending reminders or offering support.`,
      confidence: 0.80,
      metadata: {
        submission_rate: riskScore.factors.assignment_submission_rate,
      },
      is_actionable: true,
    });
  }

  // Quiz performance insights
  if (riskScore.factors.quiz_performance_trend < -10) {
    insights.push({
      insight_type: 'performance_trend',
      entity_type: 'student',
      entity_id: studentId,
      insight: `Declining quiz performance detected. Average score: ${riskScore.factors.average_quiz_score.toFixed(1)}%. Consider additional tutoring or review sessions.`,
      confidence: 0.75,
      metadata: {
        trend: riskScore.factors.quiz_performance_trend,
        average_score: riskScore.factors.average_quiz_score,
      },
      is_actionable: true,
    });
  }

  // Login frequency insights
  if (riskScore.factors.login_frequency > 7) {
    insights.push({
      insight_type: 'engagement',
      entity_type: 'student',
      entity_id: studentId,
      insight: `Student hasn't logged in for ${riskScore.factors.last_activity_days_ago} days. Consider reaching out to check in.`,
      confidence: 0.70,
      metadata: {
        days_since_login: riskScore.factors.last_activity_days_ago,
      },
      is_actionable: true,
    });
  }

  // Get completion prediction
  if (courseId) {
    try {
      const completionPred = await predictCourseCompletion(studentId, courseId);
      if (completionPred.completion_probability < 50) {
        insights.push({
          insight_type: 'completion_prediction',
          entity_type: 'student',
          entity_id: studentId,
          insight: `Low completion probability (${completionPred.completion_probability.toFixed(1)}%). Intervention recommended to improve course completion chances.`,
          confidence: completionPred.confidence / 100,
          metadata: {
            completion_probability: completionPred.completion_probability,
            predicted_date: completionPred.predicted_completion_date,
          },
          is_actionable: true,
        });
      }
    } catch (error) {
      // Skip if prediction fails
    }
  }

  // Get grade prediction
  if (courseId) {
    try {
      const gradePred = await predictGrade(studentId, courseId);
      if (gradePred.predicted_grade === 'D' || gradePred.predicted_grade === 'F') {
        insights.push({
          insight_type: 'grade_prediction',
          entity_type: 'student',
          entity_id: studentId,
          insight: `Predicted grade: ${gradePred.predicted_grade} (${gradePred.predicted_percentage.toFixed(1)}%). Additional support may help improve performance.`,
          confidence: gradePred.confidence / 100,
          metadata: {
            predicted_grade: gradePred.predicted_grade,
            predicted_percentage: gradePred.predicted_percentage,
          },
          is_actionable: true,
        });
      }
    } catch (error) {
      // Skip if prediction fails
    }
  }

  return insights;
}

/**
 * Generate insights for a course
 */
export async function generateCourseInsights(courseId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const supabase = createServiceSupabaseClient();

  // Get course statistics
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id, progress_percentage, status')
    .eq('course_id', courseId);

  const totalStudents = enrollments?.length || 0;
  const activeStudents = enrollments?.filter(e => e.status === 'active').length || 0;
  const averageProgress = enrollments && enrollments.length > 0
    ? enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollments.length
    : 0;

  // Low engagement insight
  if (averageProgress < 50 && totalStudents > 0) {
    insights.push({
      insight_type: 'engagement',
      entity_type: 'course',
      entity_id: courseId,
      insight: `Low average course progress (${averageProgress.toFixed(1)}%). Consider sending engagement reminders or reviewing course content difficulty.`,
      confidence: 0.75,
      metadata: {
        average_progress: averageProgress,
        total_students: totalStudents,
      },
      is_actionable: true,
    });
  }

  // Get at-risk students count
  const { data: riskScores } = await supabase
    .from('student_risk_scores')
    .select('risk_level')
    .eq('course_id', courseId)
    .in('risk_level', ['high', 'critical']);

  const atRiskCount = riskScores?.length || 0;
  const atRiskPercentage = totalStudents > 0 ? (atRiskCount / totalStudents) * 100 : 0;

  if (atRiskPercentage > 20) {
    insights.push({
      insight_type: 'risk_alert',
      entity_type: 'course',
      entity_id: courseId,
      insight: `${atRiskCount} students (${atRiskPercentage.toFixed(1)}%) are at high or critical risk. Consider implementing intervention strategies.`,
      confidence: 0.85,
      metadata: {
        at_risk_count: atRiskCount,
        at_risk_percentage: atRiskPercentage,
      },
      is_actionable: true,
    });
  }

  return insights;
}

/**
 * Store insights in database
 */
export async function storeInsights(insights: Insight[]): Promise<void> {
  const supabase = createServiceSupabaseClient();

  for (const insight of insights) {
    await supabase.from('ai_insights').insert({
      insight_type: insight.insight_type,
      entity_type: insight.entity_type,
      entity_id: insight.entity_id,
      insight: insight.insight,
      confidence: insight.confidence,
      metadata: insight.metadata,
      is_actionable: insight.is_actionable,
    });
  }
}


