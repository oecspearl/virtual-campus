import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface EngagementScore {
  student_id: string;
  course_id: string | null;
  score: number;
  component_scores: Record<string, number>;
  score_date: string;
}

export interface EngagementWeights {
  login_frequency: number;
  lesson_completion_rate: number;
  quiz_performance: number;
  assignment_submission_rate: number;
  discussion_participation: number;
  time_on_platform: number;
}

const DEFAULT_WEIGHTS: EngagementWeights = {
  login_frequency: 0.15,
  lesson_completion_rate: 0.20,
  quiz_performance: 0.20,
  assignment_submission_rate: 0.20,
  discussion_participation: 0.10,
  time_on_platform: 0.15,
};

/**
 * Get the active engagement config weights.
 */
async function getActiveWeights(): Promise<{ id: string; weights: EngagementWeights }> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('crm_engagement_config')
    .select('id, weights')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    return { id: data.id, weights: data.weights as EngagementWeights };
  }
  return { id: '', weights: DEFAULT_WEIGHTS };
}

/**
 * Calculate login frequency score (0-100).
 * Based on unique active days in last 30 days.
 */
async function calcLoginFrequencyScore(studentId: string): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('student_activity_log')
    .select('created_at')
    .eq('student_id', studentId)
    .gte('created_at', thirtyDaysAgo);

  if (!data || data.length === 0) return 0;

  const uniqueDays = new Set(data.map(d => new Date(d.created_at).toISOString().slice(0, 10)));
  // 20+ unique days = 100, scale linearly
  return Math.min(100, Math.round((uniqueDays.size / 20) * 100));
}

/**
 * Calculate lesson completion rate score (0-100).
 */
async function calcLessonCompletionScore(studentId: string, courseId?: string): Promise<number> {
  const supabase = createServiceSupabaseClient();

  let query = supabase
    .from('progress')
    .select('status')
    .eq('student_id', studentId);

  if (courseId) {
    // Get lesson IDs for this course
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);
    if (lessons && lessons.length > 0) {
      query = query.in('lesson_id', lessons.map(l => l.id));
    }
  }

  const { data } = await query;
  if (!data || data.length === 0) return 0;

  const completed = data.filter(p => p.status === 'completed').length;
  return Math.round((completed / data.length) * 100);
}

/**
 * Calculate quiz performance score (0-100).
 * Based on average quiz score percentage.
 */
async function calcQuizPerformanceScore(studentId: string, courseId?: string): Promise<number> {
  const supabase = createServiceSupabaseClient();

  let query = supabase
    .from('quiz_attempts')
    .select('percentage')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'graded']);

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data } = await query;
  if (!data || data.length === 0) return 0;

  const avg = data.reduce((sum, a) => sum + (a.percentage || 0), 0) / data.length;
  return Math.round(Math.min(100, avg));
}

/**
 * Calculate assignment submission rate score (0-100).
 */
async function calcAssignmentSubmissionScore(studentId: string, courseId?: string): Promise<number> {
  const supabase = createServiceSupabaseClient();

  // Get assignments for the student's courses
  let assignmentQuery = supabase.from('assignments').select('id').eq('published', true);
  if (courseId) {
    assignmentQuery = assignmentQuery.eq('course_id', courseId);
  }

  const { data: assignments } = await assignmentQuery;
  if (!assignments || assignments.length === 0) return 100; // No assignments = full score

  const assignmentIds = assignments.map(a => a.id);
  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('assignment_id')
    .eq('student_id', studentId)
    .in('assignment_id', assignmentIds)
    .in('status', ['submitted', 'graded']);

  const submittedCount = new Set((submissions || []).map(s => s.assignment_id)).size;
  return Math.round((submittedCount / assignments.length) * 100);
}

/**
 * Calculate discussion participation score (0-100).
 * Based on number of discussion posts/replies in last 30 days.
 */
async function calcDiscussionParticipationScore(studentId: string): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count: postCount } = await supabase
    .from('student_activity_log')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('item_type', 'discussion')
    .gte('created_at', thirtyDaysAgo);

  // 10+ discussion activities in 30 days = 100
  return Math.min(100, Math.round(((postCount || 0) / 10) * 100));
}

/**
 * Calculate time on platform score (0-100).
 * Based on total activities in last 30 days as a proxy for time spent.
 */
async function calcTimeOnPlatformScore(studentId: string): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('student_activity_log')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .gte('created_at', thirtyDaysAgo);

  // 100+ activities in 30 days = 100 score
  return Math.min(100, Math.round(((count || 0) / 100) * 100));
}

/**
 * Calculate the full engagement score for a student.
 */
export async function calculateEngagementScore(
  studentId: string,
  courseId?: string
): Promise<EngagementScore> {
  const { id: configId, weights } = await getActiveWeights();

  // Calculate all component scores in parallel
  const [
    loginFrequency,
    lessonCompletion,
    quizPerformance,
    assignmentSubmission,
    discussionParticipation,
    timeOnPlatform,
  ] = await Promise.all([
    calcLoginFrequencyScore(studentId),
    calcLessonCompletionScore(studentId, courseId || undefined),
    calcQuizPerformanceScore(studentId, courseId || undefined),
    calcAssignmentSubmissionScore(studentId, courseId || undefined),
    calcDiscussionParticipationScore(studentId),
    calcTimeOnPlatformScore(studentId),
  ]);

  const componentScores = {
    login_frequency: loginFrequency,
    lesson_completion_rate: lessonCompletion,
    quiz_performance: quizPerformance,
    assignment_submission_rate: assignmentSubmission,
    discussion_participation: discussionParticipation,
    time_on_platform: timeOnPlatform,
  };

  // Weighted composite score
  const score = Math.round(
    loginFrequency * weights.login_frequency +
    lessonCompletion * weights.lesson_completion_rate +
    quizPerformance * weights.quiz_performance +
    assignmentSubmission * weights.assignment_submission_rate +
    discussionParticipation * weights.discussion_participation +
    timeOnPlatform * weights.time_on_platform
  );

  const today = new Date().toISOString().slice(0, 10);

  // Upsert score snapshot
  const supabase = createServiceSupabaseClient();
  await supabase
    .from('crm_engagement_scores')
    .upsert(
      {
        student_id: studentId,
        course_id: courseId || null,
        score: Math.min(100, Math.max(0, score)),
        component_scores: componentScores,
        score_date: today,
        config_id: configId || null,
      },
      { onConflict: 'student_id,course_id,score_date' }
    );

  return {
    student_id: studentId,
    course_id: courseId || null,
    score: Math.min(100, Math.max(0, score)),
    component_scores: componentScores,
    score_date: today,
  };
}

/**
 * Calculate engagement scores for all active students.
 */
export async function calculateAllEngagementScores(): Promise<{ calculated: number; errors: number }> {
  const supabase = createServiceSupabaseClient();
  const results = { calculated: 0, errors: 0 };

  const { data: students } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'student');

  if (!students) return results;

  for (const student of students) {
    try {
      await calculateEngagementScore(student.id);
      results.calculated++;
    } catch (err) {
      console.error(`Engagement: Failed for ${student.id}`, err);
      results.errors++;
    }
  }

  return results;
}

/**
 * Get engagement trend for a student over the given number of days.
 */
export async function getEngagementTrend(
  studentId: string,
  days: number = 14
): Promise<'up' | 'down' | 'stable'> {
  const supabase = createServiceSupabaseClient();
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from('crm_engagement_scores')
    .select('score, score_date')
    .eq('student_id', studentId)
    .is('course_id', null)
    .gte('score_date', fromDate)
    .order('score_date', { ascending: true });

  if (!data || data.length < 2) return 'stable';

  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint);
  const secondHalf = data.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}
