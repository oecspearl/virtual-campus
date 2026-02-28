import { createServiceSupabaseClient } from '@/lib/supabase-server';

interface AdaptiveRule {
  id: string;
  condition_type: string;
  condition_value: {
    threshold?: number;
    topics?: string[];
    max_time?: number;
  };
  action_type: string;
  action_target: string | null;
  priority: number;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  max_score: number;
  percentage: number;
  time_taken?: number;
  answers?: Array<{
    question_id: string;
    answer: unknown;
    correct: boolean;
    points_earned: number;
    topic?: string;
  }>;
}

/**
 * Generate adaptive recommendations based on quiz performance
 */
export async function generateAdaptiveRecommendations(
  attemptId: string,
  studentId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = createServiceSupabaseClient();

    // Get the quiz attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, student_id, score, max_score, percentage, time_taken, answers')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return { success: false, count: 0, error: 'Quiz attempt not found' };
    }

    // Get applicable rules for this quiz
    const { data: rules, error: rulesError } = await supabase
      .from('adaptive_rules')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)
      .order('priority', { ascending: false });

    if (rulesError) {
      console.error('Error fetching adaptive rules:', rulesError);
      return { success: false, count: 0, error: 'Failed to fetch rules' };
    }

    if (!rules || rules.length === 0) {
      return { success: true, count: 0 };
    }

    // Evaluate rules and generate recommendations
    const recommendations: Array<{
      rule_id: string;
      quiz_attempt_id: string;
      recommendation_type: string;
      target_id: string | null;
      student_id: string;
      status: string;
    }> = [];

    for (const rule of rules as AdaptiveRule[]) {
      const conditionMet = evaluateCondition(rule, attempt);

      if (conditionMet) {
        // Check if recommendation already exists for this rule + attempt
        const { data: existing } = await supabase
          .from('student_adaptive_recommendations')
          .select('id')
          .eq('rule_id', rule.id)
          .eq('quiz_attempt_id', attempt.id)
          .eq('student_id', studentId)
          .single();

        if (!existing) {
          recommendations.push({
            rule_id: rule.id,
            quiz_attempt_id: attempt.id,
            recommendation_type: rule.action_type,
            target_id: rule.action_target,
            student_id: studentId,
            status: 'pending',
          });
        }
      }
    }

    // Insert recommendations
    if (recommendations.length > 0) {
      const { error: insertError } = await supabase
        .from('student_adaptive_recommendations')
        .insert(recommendations);

      if (insertError) {
        console.error('Error inserting recommendations:', insertError);
        return { success: false, count: 0, error: 'Failed to create recommendations' };
      }
    }

    return { success: true, count: recommendations.length };
  } catch (error) {
    console.error('Error generating adaptive recommendations:', error);
    return { success: false, count: 0, error: 'Internal error' };
  }
}

/**
 * Update student competencies based on quiz performance
 */
export async function updateCompetenciesFromQuiz(
  quizId: string,
  studentId: string,
  percentage: number
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const supabase = createServiceSupabaseClient();

    // Get quiz's associated lesson
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('lesson_id')
      .eq('id', quizId)
      .single();

    if (!quiz?.lesson_id) {
      return { success: true, updated: 0 };
    }

    // Get competencies linked to this lesson
    const { data: lessonCompetencies } = await supabase
      .from('lesson_competencies')
      .select('competency_id, weight')
      .eq('lesson_id', quiz.lesson_id);

    if (!lessonCompetencies || lessonCompetencies.length === 0) {
      return { success: true, updated: 0 };
    }

    let updated = 0;

    for (const lc of lessonCompetencies) {
      // Calculate level contribution (percentage * weight, normalized to 0-5 scale)
      const levelContribution = (percentage / 100) * (lc.weight || 1) * 5;

      // Get current competency level
      const { data: current } = await supabase
        .from('student_competencies')
        .select('id, current_level, evidence')
        .eq('student_id', studentId)
        .eq('competency_id', lc.competency_id)
        .single();

      const evidence = current?.evidence || [];
      evidence.push({
        source: 'quiz',
        quiz_id: quizId,
        score: percentage,
        date: new Date().toISOString(),
      });

      // Calculate new level as weighted average
      const totalWeight = evidence.length;
      const weightedSum = evidence.reduce((sum: number, e: { score: number }) => sum + (e.score / 100) * 5, 0);
      const newLevel = Math.min(5, Math.round((weightedSum / totalWeight) * 100) / 100);

      if (current) {
        // Update existing
        const { error: updateError } = await supabase
          .from('student_competencies')
          .update({
            current_level: newLevel,
            evidence,
            updated_at: new Date().toISOString(),
          })
          .eq('id', current.id);

        if (!updateError) updated++;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('student_competencies')
          .insert({
            student_id: studentId,
            competency_id: lc.competency_id,
            current_level: newLevel,
            evidence,
          });

        if (!insertError) updated++;
      }
    }

    return { success: true, updated };
  } catch (error) {
    console.error('Error updating competencies:', error);
    return { success: false, updated: 0, error: 'Internal error' };
  }
}

/**
 * Update competencies from assignment grade
 */
export async function updateCompetenciesFromAssignment(
  assignmentId: string,
  studentId: string,
  percentage: number
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const supabase = createServiceSupabaseClient();

    // Get assignment's associated lesson
    const { data: assignment } = await supabase
      .from('assignments')
      .select('lesson_id')
      .eq('id', assignmentId)
      .single();

    if (!assignment?.lesson_id) {
      return { success: true, updated: 0 };
    }

    // Get competencies linked to this lesson
    const { data: lessonCompetencies } = await supabase
      .from('lesson_competencies')
      .select('competency_id, weight')
      .eq('lesson_id', assignment.lesson_id);

    if (!lessonCompetencies || lessonCompetencies.length === 0) {
      return { success: true, updated: 0 };
    }

    let updated = 0;

    for (const lc of lessonCompetencies) {
      // Get current competency level
      const { data: current } = await supabase
        .from('student_competencies')
        .select('id, current_level, evidence')
        .eq('student_id', studentId)
        .eq('competency_id', lc.competency_id)
        .single();

      const evidence = current?.evidence || [];
      evidence.push({
        source: 'assignment',
        assignment_id: assignmentId,
        score: percentage,
        date: new Date().toISOString(),
      });

      // Calculate new level
      const totalWeight = evidence.length;
      const weightedSum = evidence.reduce((sum: number, e: { score: number }) => sum + (e.score / 100) * 5, 0);
      const newLevel = Math.min(5, Math.round((weightedSum / totalWeight) * 100) / 100);

      if (current) {
        const { error: updateError } = await supabase
          .from('student_competencies')
          .update({
            current_level: newLevel,
            evidence,
            updated_at: new Date().toISOString(),
          })
          .eq('id', current.id);

        if (!updateError) updated++;
      } else {
        const { error: insertError } = await supabase
          .from('student_competencies')
          .insert({
            student_id: studentId,
            competency_id: lc.competency_id,
            current_level: newLevel,
            evidence,
          });

        if (!insertError) updated++;
      }
    }

    return { success: true, updated };
  } catch (error) {
    console.error('Error updating competencies from assignment:', error);
    return { success: false, updated: 0, error: 'Internal error' };
  }
}

/**
 * Evaluate if a rule condition is met
 */
function evaluateCondition(rule: AdaptiveRule, attempt: QuizAttempt): boolean {
  const { condition_type, condition_value } = rule;
  const threshold = condition_value?.threshold || 70;

  switch (condition_type) {
    case 'score_below':
      return attempt.percentage < threshold;

    case 'score_above':
      return attempt.percentage >= threshold;

    case 'topic_weak': {
      const weakTopics = condition_value?.topics || [];
      if (!attempt.answers || weakTopics.length === 0) return false;

      const topicScores: Record<string, { correct: number; total: number }> = {};

      attempt.answers.forEach((answer) => {
        const topic = answer.topic || 'general';
        if (!topicScores[topic]) {
          topicScores[topic] = { correct: 0, total: 0 };
        }
        topicScores[topic].total++;
        if (answer.correct) {
          topicScores[topic].correct++;
        }
      });

      return weakTopics.some(topic => {
        const score = topicScores[topic];
        if (!score || score.total === 0) return false;
        return (score.correct / score.total) * 100 < threshold;
      });
    }

    case 'time_exceeded': {
      const maxTime = condition_value?.max_time || 3600;
      return (attempt.time_taken || 0) > maxTime;
    }

    default:
      return false;
  }
}

/**
 * Get pending recommendations count for a student
 */
export async function getPendingRecommendationsCount(studentId: string): Promise<number> {
  try {
    const supabase = createServiceSupabaseClient();

    const { count } = await supabase
      .from('student_adaptive_recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'pending');

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Check if student has weak competencies that need attention
 */
export async function getWeakCompetencies(
  studentId: string,
  threshold: number = 2.5
): Promise<Array<{ competency_id: string; name: string; level: number }>> {
  try {
    const supabase = createServiceSupabaseClient();

    const { data } = await supabase
      .from('student_competencies')
      .select(`
        competency_id,
        current_level,
        competency:competencies(name, category)
      `)
      .eq('student_id', studentId)
      .lt('current_level', threshold);

    return (data || []).map(sc => ({
      competency_id: sc.competency_id,
      name: (sc.competency as any)?.name || 'Unknown',
      level: sc.current_level,
    }));
  } catch {
    return [];
  }
}
