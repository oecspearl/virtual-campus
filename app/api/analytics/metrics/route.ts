import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// Cache configuration (simple in-memory cache for development)
// TODO: Replace with Redis for production
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Analytics Metrics API
 * 
 * GET /api/analytics/metrics?type={metricType}&start_date={date}&end_date={date}&course_id={uuid}
 * 
 * Metric Types:
 * - 'dau' - Daily Active Users
 * - 'course_engagement' - Course engagement metrics
 * - 'activity_types' - Breakdown by activity type
 * - 'course_completion' - Course completion rates
 * - 'student_progress' - Student progress tracking
 * 
 * This is a SAFE endpoint - read-only, doesn't modify existing data
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Only admins, instructors, and curriculum designers can access analytics
    const allowedRoles = ['admin', 'super_admin', 'instructor', 'curriculum_designer'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({
        error: "Forbidden",
        message: "Analytics access requires admin, instructor, or curriculum designer role"
      }, { status: 403 });
    }

    const serviceSupabase = createServiceSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const metricType = searchParams.get('type');
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const courseId = searchParams.get('course_id');

    if (!metricType) {
      return NextResponse.json({ 
        error: "Bad Request", 
        message: "Metric type is required. Use ?type=dau, course_engagement, etc." 
      }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `${metricType}_${startDate}_${endDate}_${courseId || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        metric_type: metricType,
        start_date: startDate,
        end_date: endDate,
        course_id: courseId || null,
        data: cached.data,
        count: Array.isArray(cached.data) ? cached.data.length : 0,
        generated_at: new Date(cached.timestamp).toISOString(),
        cached: true
      });
    }

    let data: any = null;
    let error: any = null;

    // Route to appropriate metric query based on type
    switch (metricType) {
      case 'dau':
        // Daily Active Users — derived from student_activity_log
        try {
          const { data: activityLogs, error: activityLogsError } = await serviceSupabase
            .from('student_activity_log')
            .select('student_id, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          if (activityLogsError || !activityLogs) {
            data = [];
            error = null;
          } else {
            // Group by date and count unique users
            const dailyUsers: Record<string, Set<string>> = {};
            activityLogs.forEach((log: any) => {
              const date = log.created_at?.split('T')[0];
              if (date) {
                if (!dailyUsers[date]) dailyUsers[date] = new Set();
                dailyUsers[date].add(log.student_id);
              }
            });
            data = Object.entries(dailyUsers)
              .map(([date, users]) => ({ date, active_users: users.size }))
              .sort((a, b) => b.date.localeCompare(a.date));
            error = null;
          }
        } catch {
          data = [];
          error = null;
        }
        break;

      case 'course_engagement':
        // Course engagement — derived from student_activity_log
        try {
          const { data: engagementLogs, error: engagementError } = await serviceSupabase
            .from('student_activity_log')
            .select('student_id, course_id, activity_type, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .not('course_id', 'is', null);

          if (engagementError || !engagementLogs) {
            data = [];
            error = null;
          } else {
            const courseEngagement: Record<string, { course_id: string; active_students: Set<string>; total_interactions: number }> = {};
            engagementLogs.forEach((log: any) => {
              if (!log.course_id) return;
              if (!courseEngagement[log.course_id]) {
                courseEngagement[log.course_id] = { course_id: log.course_id, active_students: new Set(), total_interactions: 0 };
              }
              courseEngagement[log.course_id].active_students.add(log.student_id);
              courseEngagement[log.course_id].total_interactions++;
            });
            data = Object.values(courseEngagement)
              .map((e: any) => ({ course_id: e.course_id, active_students: e.active_students.size, total_interactions: e.total_interactions }))
              .sort((a: any, b: any) => b.total_interactions - a.total_interactions);
            error = null;
          }
        } catch {
          data = [];
          error = null;
        }
        break;

      case 'activity_types':
        // Activity type breakdown — derived from student_activity_log
        try {
          const { data: typeLogs, error: typeError } = await serviceSupabase
            .from('student_activity_log')
            .select('activity_type, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          if (typeError || !typeLogs) {
            data = [];
            error = null;
          } else {
            const typeCounts: Record<string, number> = {};
            typeLogs.forEach((log: any) => {
              const t = log.activity_type || 'other';
              typeCounts[t] = (typeCounts[t] || 0) + 1;
            });
            data = Object.entries(typeCounts)
              .map(([activity_type, count]) => ({ activity_type, count }))
              .sort((a, b) => b.count - a.count);
            error = null;
          }
        } catch {
          data = [];
          error = null;
        }
        break;

      case 'course_completion':
        // Calculate course completion rates from enrollments
        try {
          // Fetch enrollments (without join to avoid relationship issues)
          // Use service client to bypass RLS if needed
          const { data: enrollmentsData, error: enrollmentsError } = await serviceSupabase
            .from('enrollments')
            .select('id, course_id, status, progress_percentage')
            .eq('status', 'active')
            .limit(10000); // Add limit to prevent query timeouts

          if (enrollmentsError) {
            console.error('Enrollments query error:', enrollmentsError);
            // Return empty array instead of throwing to prevent API failure
            data = [];
            error = null;
            break;
          }

          if (!enrollmentsData || enrollmentsData.length === 0) {
            data = [];
            error = null;
            break;
          }

          // Get unique course IDs (filter out null/undefined and validate UUIDs)
          const courseIds = [...new Set(
            enrollmentsData
              .map((e: any) => e.course_id)
              .filter((id: any) => id && typeof id === 'string' && id.length > 0)
          )];
          
          // Fetch course titles separately if not already in enrollment data
          const courseTitles: Record<string, string> = {};
          if (courseIds.length > 0 && courseIds.length <= 100) { // Limit to prevent query issues
            try {
              const { data: coursesData, error: coursesError } = await serviceSupabase
                .from('courses')
                .select('id, title')
                .in('id', courseIds);
              
              if (coursesError) {
                console.error('Courses query error:', coursesError);
                // Continue without course titles - we'll use 'Unknown' as fallback
              } else if (coursesData && Array.isArray(coursesData)) {
                coursesData.forEach((course: any) => {
                  if (course && course.id) {
                    courseTitles[course.id] = course.title || 'Unknown';
                  }
                });
              }
            } catch (courseQueryError: any) {
              console.error('Course titles query failed:', courseQueryError);
              // Continue without course titles
            }
          }

          // Group by course and calculate completion stats
          const courseStats: Record<string, any> = {};
          try {
            enrollmentsData.forEach((enrollment: any) => {
              const courseId = enrollment?.course_id;
              
              // Skip if no valid course_id
              if (!courseId || typeof courseId !== 'string') return;
              
              if (!courseStats[courseId]) {
                courseStats[courseId] = {
                  course_id: courseId,
                  course_title: courseTitles[courseId] || 'Unknown',
                  total_enrollments: 0,
                  completed: 0,
                  in_progress: 0,
                  not_started: 0,
                  avg_progress: 0
                };
              }
              
              courseStats[courseId].total_enrollments++;
              
              // Ensure progress is a valid number
              const progress = typeof enrollment.progress_percentage === 'number' 
                ? Math.max(0, Math.min(100, enrollment.progress_percentage))
                : 0;
              
              if (progress >= 100) {
                courseStats[courseId].completed++;
              } else if (progress > 0) {
                courseStats[courseId].in_progress++;
              } else {
                courseStats[courseId].not_started++;
              }
              
              courseStats[courseId].avg_progress += progress;
            });

            // Calculate averages
            Object.values(courseStats).forEach((stat: any) => {
              if (stat.total_enrollments > 0) {
                stat.avg_progress = Math.round(stat.avg_progress / stat.total_enrollments);
                stat.completion_rate = Math.round((stat.completed / stat.total_enrollments) * 100);
              } else {
                stat.avg_progress = 0;
                stat.completion_rate = 0;
              }
            });

            data = Object.values(courseStats);
            error = null;
          } catch (calcError: any) {
            console.error('Completion stats calculation error:', calcError);
            data = [];
            error = null;
          }
        } catch (completionError: any) {
          console.error('Course completion calculation error:', completionError);
          // Return empty data on error instead of failing the entire request
          data = [];
          error = null;
        }
        break;

      case 'student_progress':
        // Student progress tracking across all courses
        const { data: progressData, error: progressError } = await serviceSupabase
          .from('enrollments')
          .select(`
            student_id,
            course_id,
            progress_percentage,
            status,
            courses(id, title)
          `)
          .eq('status', 'active');

        if (!progressError && progressData) {
          // Group by student
          const studentStats = progressData.reduce((acc: Record<string, any>, enrollment: any) => {
            const studentId = enrollment.student_id;
            if (!acc[studentId]) {
              acc[studentId] = {
                student_id: studentId,
                total_courses: 0,
                completed_courses: 0,
                in_progress_courses: 0,
                avg_progress: 0,
                courses: []
              };
            }
            acc[studentId].total_courses++;
            if (enrollment.progress_percentage >= 100) {
              acc[studentId].completed_courses++;
            } else if (enrollment.progress_percentage > 0) {
              acc[studentId].in_progress_courses++;
            }
            acc[studentId].avg_progress += enrollment.progress_percentage || 0;
            acc[studentId].courses.push({
              course_id: enrollment.course_id,
              course_title: enrollment.courses?.title,
              progress: enrollment.progress_percentage || 0
            });
            return acc;
          }, {} as Record<string, any>);

          // Calculate averages
          Object.values(studentStats).forEach((stat: any) => {
            stat.avg_progress = stat.total_courses > 0
              ? Math.round(stat.avg_progress / stat.total_courses)
              : 0;
            stat.completion_rate = stat.total_courses > 0
              ? Math.round((stat.completed_courses / stat.total_courses) * 100)
              : 0;
          });

          data = Object.values(studentStats);
          error = null;
        } else {
          error = progressError;
        }
        break;

      case 'top_courses':
        // Top performing courses by engagement — derived from student_activity_log
        try {
          const { data: topLogs, error: topLogsError } = await serviceSupabase
            .from('student_activity_log')
            .select('student_id, course_id')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .not('course_id', 'is', null)
            .limit(10000);

          if (topLogsError || !topLogs) {
            data = [];
            error = null;
          } else {
            const courseAgg: Record<string, { course_id: string; students: Set<string>; total_interactions: number }> = {};
            topLogs.forEach((log: any) => {
              if (!log.course_id) return;
              if (!courseAgg[log.course_id]) {
                courseAgg[log.course_id] = { course_id: log.course_id, students: new Set(), total_interactions: 0 };
              }
              courseAgg[log.course_id].students.add(log.student_id);
              courseAgg[log.course_id].total_interactions++;
            });

            // Get course titles
            const topCourseIds = Object.keys(courseAgg);
            const courseTitleMap: Record<string, string> = {};
            if (topCourseIds.length > 0) {
              const { data: courses } = await serviceSupabase
                .from('courses')
                .select('id, title')
                .in('id', topCourseIds.slice(0, 50));
              courses?.forEach((c: any) => { courseTitleMap[c.id] = c.title; });
            }

            data = Object.values(courseAgg)
              .map((e: any) => ({
                course_id: e.course_id,
                course_title: courseTitleMap[e.course_id] || 'Unknown',
                total_interactions: e.total_interactions,
                total_students: e.students.size,
              }))
              .sort((a: any, b: any) => b.total_interactions - a.total_interactions)
              .slice(0, 10);
            error = null;
          }
        } catch {
          data = [];
          error = null;
        }
        break;

      case 'time_spent':
        // Estimate time spent based on activity frequency
        const { data: timeActivityData, error: timeActivityError } = await serviceSupabase
          .from('student_activity_log')
          .select(`
            student_id,
            course_id,
            activity_type,
            created_at,
            courses(id, title)
          `)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (!timeActivityError && timeActivityData) {
          // Estimate time: each activity = ~5 minutes average
          const timeStats = timeActivityData.reduce((acc: any, activity: any) => {
            const key = activity.course_id || 'no_course';
            if (!acc[key]) {
              acc[key] = {
                course_id: activity.course_id,
                course_title: activity.courses?.title || 'General',
                total_activities: 0,
                estimated_minutes: 0,
                unique_students: new Set(),
              };
            }
            acc[key].total_activities++;
            acc[key].estimated_minutes += 5; // Average 5 min per activity
            acc[key].unique_students.add(activity.student_id);
          }, {});

          // Convert to hours and format
          data = Object.values(timeStats).map((stat: any) => ({
            ...stat,
            unique_students: stat.unique_students.size,
            estimated_hours: Math.round((stat.estimated_minutes / 60) * 10) / 10,
          }));
          error = null;
        } else {
          error = timeActivityError;
        }
        break;

      case 'quiz_performance':
        // Quiz performance metrics
        const { data: quizAttemptsData, error: quizAttemptsError } = await serviceSupabase
          .from('quiz_attempts')
          .select(`
            id,
            quiz_id,
            student_id,
            score,
            total_points,
            status,
            completed_at,
            quizzes(id, title, course_id),
            courses(id, title)
          `)
          .gte('completed_at', startDate)
          .lte('completed_at', endDate)
          .eq('status', 'completed');

        if (!quizAttemptsError && quizAttemptsData) {
          // Group by quiz
          const quizStats = quizAttemptsData.reduce((acc: any, attempt: any) => {
            const quizId = attempt.quiz_id;
            if (!acc[quizId]) {
              acc[quizId] = {
                quiz_id: quizId,
                quiz_title: attempt.quizzes?.title || 'Unknown',
                course_id: attempt.quizzes?.course_id,
                course_title: attempt.courses?.title || 'Unknown',
                total_attempts: 0,
                total_students: new Set(),
                total_score: 0,
                total_points: 0,
                passed: 0,
              };
            }
            acc[quizId].total_attempts++;
            acc[quizId].total_students.add(attempt.student_id);
            acc[quizId].total_score += attempt.score || 0;
            acc[quizId].total_points += attempt.total_points || 0;
            const percentage = attempt.total_points > 0 ? ((attempt.score || 0) / attempt.total_points) * 100 : 0;
            if (percentage >= 70) acc[quizId].passed++; // 70% passing threshold
          }, {});

          // Calculate averages and rates
          data = Object.values(quizStats).map((stat: any) => ({
            ...stat,
            total_students: stat.total_students.size,
            average_score: stat.total_attempts > 0 ? Math.round((stat.total_score / stat.total_attempts) * 10) / 10 : 0,
            average_percentage: stat.total_points > 0 ? Math.round(((stat.total_score / stat.total_points) * 100) * 10) / 10 : 0,
            pass_rate: stat.total_attempts > 0 ? Math.round((stat.passed / stat.total_attempts) * 100) : 0,
          }));
          error = null;
        } else {
          error = quizAttemptsError;
        }
        break;

      case 'assignment_performance':
        // Assignment performance metrics
        const { data: assignmentSubmissionsData, error: assignmentSubmissionsError } = await serviceSupabase
          .from('assignment_submissions')
          .select(`
            id,
            assignment_id,
            student_id,
            score,
            total_points,
            status,
            submitted_at,
            assignments(id, title, course_id),
            courses(id, title)
          `)
          .gte('submitted_at', startDate)
          .lte('submitted_at', endDate)
          .in('status', ['submitted', 'graded']);

        if (!assignmentSubmissionsError && assignmentSubmissionsData) {
          // Group by assignment
          const assignmentStats = assignmentSubmissionsData.reduce((acc: any, submission: any) => {
            const assignmentId = submission.assignment_id;
            if (!acc[assignmentId]) {
              acc[assignmentId] = {
                assignment_id: assignmentId,
                assignment_title: submission.assignments?.title || 'Unknown',
                course_id: submission.assignments?.course_id,
                course_title: submission.courses?.title || 'Unknown',
                total_submissions: 0,
                total_students: new Set(),
                graded_submissions: 0,
                total_score: 0,
                total_points: 0,
              };
            }
            acc[assignmentId].total_submissions++;
            acc[assignmentId].total_students.add(submission.student_id);
            if (submission.status === 'graded' && submission.score !== null) {
              acc[assignmentId].graded_submissions++;
              acc[assignmentId].total_score += submission.score || 0;
              acc[assignmentId].total_points += submission.total_points || 0;
            }
          }, {});

          // Calculate averages
          data = Object.values(assignmentStats).map((stat: any) => ({
            ...stat,
            total_students: stat.total_students.size,
            grading_rate: stat.total_submissions > 0 ? Math.round((stat.graded_submissions / stat.total_submissions) * 100) : 0,
            average_score: stat.graded_submissions > 0 ? Math.round((stat.total_score / stat.graded_submissions) * 10) / 10 : 0,
            average_percentage: stat.total_points > 0 ? Math.round(((stat.total_score / stat.total_points) * 100) * 10) / 10 : 0,
          }));
          error = null;
        } else {
          error = assignmentSubmissionsError;
        }
        break;

      case 'engagement_trends':
        // Engagement trends over time (daily breakdown)
        const { data: trendData, error: trendError } = await serviceSupabase
          .from('student_activity_log')
          .select('created_at, activity_type, course_id')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (!trendError && trendData) {
          // Group by date and activity type
          const trends = trendData.reduce((acc: any, log: any) => {
            const date = log.created_at.split('T')[0];
            const type = log.activity_type || 'other';
            
            if (!acc[date]) {
              acc[date] = {
                date,
                total_activities: 0,
                activities_by_type: {},
                unique_courses: new Set(),
              };
            }
            acc[date].total_activities++;
            acc[date].activities_by_type[type] = (acc[date].activities_by_type[type] || 0) + 1;
            if (log.course_id) acc[date].unique_courses.add(log.course_id);
          }, {});

          // Format for chart
          data = Object.values(trends).map((trend: any) => ({
            ...trend,
            unique_courses: trend.unique_courses.size,
            activities_by_type: trend.activities_by_type,
          }));
          error = null;
        } else {
          error = trendError;
        }
        break;

      default:
        return NextResponse.json({ 
          error: "Bad Request", 
          message: `Unknown metric type: ${metricType}. Available types: dau, course_engagement, activity_types, course_completion, student_progress, top_courses, time_spent, quiz_performance, assignment_performance, engagement_trends` 
        }, { status: 400 });
    }

    // Ensure data is always an array, never null or undefined
    const safeData = Array.isArray(data) ? data : [];
    
    // For course_completion specifically, ensure we never return error
    // Always return success with empty array if there's any issue
    if (metricType === 'course_completion' && error) {
      console.error('Course completion error (suppressed):', error);
      // Return success with empty data instead of error
      return NextResponse.json({
        success: true,
        metric_type: metricType,
        start_date: startDate,
        end_date: endDate,
        course_id: courseId || null,
        data: [],
        count: 0,
        generated_at: new Date().toISOString(),
        warning: 'No completion data available at this time'
      });
    }

    if (error && metricType !== 'course_completion') {
      console.error(`Analytics query error for ${metricType}:`, error);
      // Return empty data instead of 500 to avoid breaking the dashboard
      return NextResponse.json({
        success: true,
        metric_type: metricType,
        start_date: startDate,
        end_date: endDate,
        course_id: courseId || null,
        data: [],
        count: 0,
        generated_at: new Date().toISOString(),
        warning: `No ${metricType} data available: ${error.message || 'query error'}`
      });
    }

    const result = {
      success: true,
      metric_type: metricType,
      start_date: startDate,
      end_date: endDate,
      course_id: courseId || null,
      data: safeData,
      count: safeData.length,
      generated_at: new Date().toISOString()
    };

    // Cache the result
    cache.set(cacheKey, { data: result.data, timestamp: Date.now() });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message 
    }, { status: 500 });
  }
}
