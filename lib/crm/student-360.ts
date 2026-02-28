import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentStage, getLifecycleHistory } from './lifecycle-service';

export interface Student360Data {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    gender: string | null;
    avatar: string | null;
    bio: string | null;
    learning_preferences: Record<string, any>;
    created_at: string;
  };
  lifecycle: {
    current_stage: string | null;
    stage_changed_at: string | null;
    history: Array<{
      stage: string;
      previous_stage: string | null;
      stage_changed_at: string;
      changed_by: string | null;
      change_reason: string | null;
    }>;
  };
  enrollments: Array<{
    course_id: string;
    course_title: string;
    status: string;
    progress_percentage: number;
    enrolled_at: string;
  }>;
  academic: {
    total_courses: number;
    completed_courses: number;
    average_grade: number | null;
  };
  risk: {
    risk_level: string | null;
    risk_score: number | null;
    factors: Record<string, any>;
  };
  recent_interactions: Array<{
    id: string;
    interaction_type: string;
    subject: string;
    created_by_name: string | null;
    created_at: string;
  }>;
  ai_insights: Array<{
    id: string;
    insight_type: string;
    insight: string;
    confidence: number;
    is_actionable: boolean;
    created_at: string;
  }>;
  activity_summary: {
    total_activities: number;
    last_7_days: number;
    last_30_days: number;
    last_activity_at: string | null;
  };
}

/**
 * Aggregate all data for a single student into a 360-degree view.
 * Uses parallel queries for performance.
 */
export async function getStudent360(studentId: string): Promise<Student360Data> {
  const supabase = createServiceSupabaseClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel
  const [
    userResult,
    profileResult,
    enrollmentsResult,
    riskResult,
    interactionsResult,
    insightsResult,
    activityTotalResult,
    activity7dResult,
    activity30dResult,
    lastActivityResult,
    gradesResult,
    lifecycleResult,
  ] = await Promise.all([
    // User profile
    supabase.from('users').select('id, name, email, role, gender, created_at').eq('id', studentId).single(),
    // Extended profile
    supabase.from('user_profiles').select('bio, avatar, learning_preferences').eq('user_id', studentId).single(),
    // Enrollments with course titles
    supabase.from('enrollments').select('course_id, status, progress_percentage, enrolled_at, courses(title)').eq('student_id', studentId).order('enrolled_at', { ascending: false }),
    // Latest risk score
    supabase.from('student_risk_scores').select('risk_level, risk_score, factors').eq('student_id', studentId).order('calculated_at', { ascending: false }).limit(1).single(),
    // Recent CRM interactions
    supabase.from('crm_interactions').select('id, interaction_type, subject, created_by, created_at').eq('student_id', studentId).order('created_at', { ascending: false }).limit(10),
    // AI insights
    supabase.from('ai_insights').select('id, insight_type, insight, confidence, is_actionable, created_at').eq('entity_id', studentId).eq('entity_type', 'student').order('created_at', { ascending: false }).limit(10),
    // Activity counts
    supabase.from('student_activity_log').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
    supabase.from('student_activity_log').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('created_at', sevenDaysAgo),
    supabase.from('student_activity_log').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('created_at', thirtyDaysAgo),
    // Last activity
    supabase.from('student_activity_log').select('created_at').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).single(),
    // Grades
    supabase.from('course_grades').select('grade_percentage').eq('student_id', studentId),
    // Lifecycle
    getCurrentStage(studentId),
  ]);

  const user = userResult.data;
  const userProfile = profileResult.data;
  const enrollments = enrollmentsResult.data || [];
  const riskData = riskResult.data;
  const interactions = interactionsResult.data || [];
  const insights = insightsResult.data || [];
  const grades = gradesResult.data || [];

  // Get lifecycle history
  const lifecycleHistory = await getLifecycleHistory(studentId);

  // Resolve creator names for interactions
  const creatorIds = [...new Set(interactions.map(i => i.created_by).filter(Boolean))];
  let creatorNames: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from('users')
      .select('id, name')
      .in('id', creatorIds);
    if (creators) {
      creatorNames = Object.fromEntries(creators.map(c => [c.id, c.name]));
    }
  }

  // Calculate academic stats
  const completedCourses = enrollments.filter(e => e.status === 'completed').length;
  const gradeValues = grades.map(g => g.grade_percentage).filter((g): g is number => g != null);
  const averageGrade = gradeValues.length > 0
    ? Math.round(gradeValues.reduce((sum, g) => sum + g, 0) / gradeValues.length * 100) / 100
    : null;

  return {
    profile: {
      id: user?.id || studentId,
      name: user?.name || 'Unknown',
      email: user?.email || '',
      role: user?.role || 'student',
      gender: user?.gender || null,
      avatar: userProfile?.avatar || null,
      bio: userProfile?.bio || null,
      learning_preferences: userProfile?.learning_preferences || {},
      created_at: user?.created_at || '',
    },
    lifecycle: {
      current_stage: lifecycleResult?.stage || null,
      stage_changed_at: lifecycleResult?.stage_changed_at || null,
      history: lifecycleHistory.map(h => ({
        stage: h.stage,
        previous_stage: h.previous_stage,
        stage_changed_at: h.stage_changed_at,
        changed_by: h.changed_by,
        change_reason: h.change_reason,
      })),
    },
    enrollments: enrollments.map(e => ({
      course_id: e.course_id,
      course_title: (e.courses as any)?.title || 'Unknown Course',
      status: e.status,
      progress_percentage: e.progress_percentage || 0,
      enrolled_at: e.enrolled_at,
    })),
    academic: {
      total_courses: enrollments.length,
      completed_courses: completedCourses,
      average_grade: averageGrade,
    },
    risk: {
      risk_level: riskData?.risk_level || null,
      risk_score: riskData?.risk_score || null,
      factors: riskData?.factors || {},
    },
    recent_interactions: interactions.map(i => ({
      id: i.id,
      interaction_type: i.interaction_type,
      subject: i.subject,
      created_by_name: creatorNames[i.created_by] || null,
      created_at: i.created_at,
    })),
    ai_insights: (insights as any[]).map(i => ({
      id: i.id,
      insight_type: i.insight_type,
      insight: i.insight,
      confidence: i.confidence,
      is_actionable: i.is_actionable,
      created_at: i.created_at,
    })),
    activity_summary: {
      total_activities: activityTotalResult.count || 0,
      last_7_days: activity7dResult.count || 0,
      last_30_days: activity30dResult.count || 0,
      last_activity_at: lastActivityResult.data?.created_at || null,
    },
  };
}
