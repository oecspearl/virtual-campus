import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import DashboardCard from "@/app/components/DashboardCard";
import Link from "next/link";
import GamificationWidget from "@/app/components/GamificationWidget";
import Breadcrumb from "@/app/components/Breadcrumb";
import AnnouncementsBanner from "@/app/components/AnnouncementsBanner";
import { Icon } from "@iconify/react";
import CalendarPreviewWidget from "@/app/components/student/CalendarPreviewWidget";
import TasksPreviewWidget from "@/app/components/student/TasksPreviewWidget";
import StudentToolsWidget from "@/app/components/student/StudentToolsWidget";
import MyGradesWidget from "@/app/components/student/MyGradesWidget";
import MyProgrammesWidget from "@/app/components/student/MyProgrammesWidget";
import AdaptiveLearningWidget from "@/app/components/student/AdaptiveLearningWidget";

async function getUserRoleAndName() {
  const user = await getCurrentUser();
  if (!user) return { role: null as string | null, name: "" };
  return { role: user.role, name: user.name || "" };
}

export default async function DashboardPage() {
  const { role, name } = await getUserRoleAndName();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard' },
          ]}
          className="mb-6"
        />
        {/* Announcements */}
        <div className="mb-6">
          <AnnouncementsBanner />
        </div>
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center flex-wrap gap-2">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                Welcome back, {name || 'Learner'}
              </h1>
              <p className="text-blue-100 mt-2 capitalize">Your role: {role || 'guest'}</p>
            </div>
          </div>
        </div>

        {/* Gamification (Student) */}
        {role === 'student' && (
          <div className="mb-8">
            <GamificationWidget />
          </div>
        )}

        {/* Dashboard Content */}
        <div className="space-y-8">
      {role === 'student' && await StudentView()}
      {role === 'instructor' && await InstructorView()}
      {(role === 'admin' || role === 'super_admin' || role === 'tenant_admin') && await AdminView(role!)}
      {role === 'curriculum_designer' && await DesignerView()}
      {role === 'parent' && await ParentView()}

      {!role && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center bg-white rounded-2xl shadow-xl border border-gray-100 p-12 max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Authentication Required</h3>
                <p className="text-gray-600 mb-8">Please sign in to access your personalized dashboard and learning resources.</p>
                <a 
                  href="/auth/signin" 
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function StudentView() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Use service client for read-only aggregates to avoid RLS blocking student dashboard
  const supabase = await createServiceSupabaseClient();
  
  let enrollments: any[] = [];
  
  try {
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select(`
      *,
      courses(*)
    `)
    .eq('student_id', user.id)
    .eq('status', 'active');

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
    } else {
      enrollments = enrollmentsData || [];
    }

  } catch (error) {
    console.error('Error in StudentView data fetching:', error);
  }

  const enrolledCourses = enrollments.length;
  const courseIds = enrollments?.map(e => e.course_id).filter(Boolean) || [];
  
  let availableQuizzes: any[] = [];
  let availableAssignments: any[] = [];
  let recentDiscussions: any[] = [];
  let upcomingDeadlines: any[] = [];
  let recentGrades: any[] = [];
  
  if (courseIds.length > 0) {
    try {
      // Get upcoming deadlines (assignments and quizzes) for enrolled courses
      const { data: deadlinesData, error: deadlinesError } = await supabase
        .from('assignments')
        .select('*')
        .in('course_id', courseIds)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      if (deadlinesError) {
        console.error('Error fetching deadlines:', deadlinesError);
      } else {
        upcomingDeadlines = deadlinesData || [];
      }

      // Get pending quizzes for enrolled courses
      // First try: quizzes with direct course_id
      let pendingQuizzes: any[] = [];
      let quizzesError: any = null;

      const { data: directQuizzes, error: directQuizzesError } = await supabase
        .from('quizzes')
        .select(`
          *,
          quiz_attempts!left(*),
          questions(count)
        `)
        .in('course_id', courseIds)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!directQuizzesError && directQuizzes) {
        pendingQuizzes = directQuizzes;
      } else {
        // Fallback: quizzes via lessons
        const { data: lessonQuizzes, error: lessonQuizzesError } = await supabase
          .from('quizzes')
          .select(`
            *,
            quiz_attempts!left(*),
            questions(count),
            lessons!inner(course_id)
          `)
          .in('lessons.course_id', courseIds)
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!lessonQuizzesError && lessonQuizzes) {
          pendingQuizzes = lessonQuizzes;
        } else {
          quizzesError = lessonQuizzesError;
        }
      }

      if (quizzesError) {
        console.error('Error fetching quizzes:', quizzesError);
      } else {
        // Filter out quizzes based on attempt limits
        availableQuizzes = pendingQuizzes?.filter(quiz => {
          const studentAttempts = quiz.quiz_attempts?.filter((attempt: any) => attempt.student_id === user.id) || [];
          const attemptsAllowed = quiz.attempts_allowed || 1;
          return studentAttempts.length < attemptsAllowed;
        }) || [];
      }

      // Get pending assignments for enrolled courses
      // Try direct course_id first, then fallback to lesson-based lookup
      let pendingAssignments: any[] = [];
      let assignmentsError: any = null;

      // First try: assignments with direct course_id
      const { data: directAssignments, error: directError } = await supabase
        .from('assignments')
        .select(`
          *,
          assignment_submissions!left(*)
        `)
        .in('course_id', courseIds)
        .eq('published', true)
        .order('due_date', { ascending: true })
        .limit(10);

      if (!directError && directAssignments) {
        pendingAssignments = directAssignments;
      } else {
        // Fallback: assignments via lessons
        const { data: lessonAssignments, error: lessonError } = await supabase
          .from('assignments')
          .select(`
            *,
            assignment_submissions!left(*),
            lessons!inner(course_id)
          `)
          .in('lessons.course_id', courseIds)
          .eq('published', true)
          .order('due_date', { ascending: true })
          .limit(10);

        if (!lessonError && lessonAssignments) {
          pendingAssignments = lessonAssignments;
        } else {
          assignmentsError = lessonError;
        }
      }

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
      } else {
        // Filter out assignments already submitted
        availableAssignments = pendingAssignments?.filter(assignment => 
          !assignment.assignment_submissions?.some((submission: any) => submission.student_id === user.id)
        ) || [];
      }

      // Get recent discussions for enrolled courses
      // Try course discussions first, then fallback to lesson discussions
      let discussions: any[] = [];
      let discussionsError: any = null;

      // First try: course-level discussions
      const { data: courseDiscussions, error: courseError } = await supabase
        .from('discussions')
        .select(`
          *,
          courses(title)
        `)
        .in('course_id', courseIds)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!courseError && courseDiscussions) {
        discussions = courseDiscussions;
      } else {
        // Fallback: lesson discussions
        const { data: lessonDiscussions, error: lessonError } = await supabase
          .from('lesson_discussions')
          .select(`
            *,
            lessons!inner(course_id, courses(title))
          `)
          .in('lessons.course_id', courseIds)
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!lessonError && lessonDiscussions) {
          // Transform lesson discussions to match course discussion format
          discussions = lessonDiscussions.map(ld => ({
            ...ld,
            course_id: ld.lessons.course_id,
            courses: { title: ld.lessons.courses.title }
          }));
        } else {
          discussionsError = lessonError;
        }
      }

      if (discussionsError) {
        console.error('Error fetching discussions:', discussionsError);
      } else {
        recentDiscussions = discussions || [];
      }

      // Get recent grades across all enrolled courses
      const { data: gradesData, error: gradesError } = await supabase
        .from('course_grades')
        .select(`
          *,
          grade_item:course_grade_items(title, type, category, points),
          course:courses(id, title)
        `)
        .in('course_id', courseIds)
        .eq('student_id', user.id)
        .order('graded_at', { ascending: false, nullsFirst: false })
        .limit(10);

      if (!gradesError && gradesData) {
        recentGrades = gradesData || [];
      }
    } catch (error) {
      console.error('Error fetching course-related data:', error);
    }
  }

  const deadlineCount = upcomingDeadlines.length;

  const pendingQuizCount = availableQuizzes.length;
  const pendingAssignmentCount = availableAssignments.length;
  const discussionCount = recentDiscussions.length;

  // Calculate average progress from enrollment data
  let averageProgress = 0;
  if (enrolledCourses > 0) {
    const progressValues = enrollments?.map(enrollment => 
      enrollment.progress_percentage || 0
    ) || [];
    
    if (progressValues.length > 0) {
      averageProgress = Math.round(
        progressValues.reduce((acc, val) => acc + val, 0) / progressValues.length
      );
    }
  }

  return (
    <div className="space-y-8" id="student-dashboard-content">
      {/* Stats Overview */}
      <div id="progress-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{enrolledCourses}</p>
              <p className="text-xs sm:text-sm text-gray-600">Enrolled Courses</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{averageProgress}%</p>
              <p className="text-xs sm:text-sm text-gray-600">Average Progress</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{pendingAssignmentCount}</p>
              <p className="text-xs sm:text-sm text-gray-600">Pending Assignments</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{pendingQuizCount}</p>
              <p className="text-xs sm:text-sm text-gray-600">Pending Quizzes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div 
          className="px-4 sm:px-6 py-4"
          style={{
            background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
          }}
        >
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h3>
          <p 
            className="text-sm"
            style={{ color: 'rgba(255, 255, 255, 0.9)' }}
          >Access your learning tools</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link 
              href="/my-courses" 
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg hover:bg-blue-50 transition-colors group min-h-[44px]"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 text-sm sm:text-base">My Courses</div>
                <div className="text-xs sm:text-sm text-gray-600">Continue learning</div>
              </div>
            </Link>

            <Link 
              href="/assignments" 
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg hover:bg-orange-50 transition-colors group min-h-[44px]"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 text-sm sm:text-base">Assignments</div>
                <div className="text-xs sm:text-sm text-gray-600">View pending work</div>
              </div>
            </Link>

            <Link 
              href="#progress-stats"
              prefetch={false}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg hover:bg-green-50 transition-colors group min-h-[44px]"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 text-sm sm:text-base">Progress</div>
                <div className="text-xs sm:text-sm text-gray-600">Track your learning</div>
              </div>
            </Link>

            <Link 
              href="/profile/certificates" 
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg hover:bg-purple-50 transition-colors group min-h-[44px]"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 text-sm sm:text-base">Certificates</div>
                <div className="text-xs sm:text-sm text-gray-600">View your achievements</div>
              </div>
            </Link>

            <Link
              href="#my-grades"
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg hover:bg-yellow-50 transition-colors group min-h-[44px]"
            >
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 text-sm sm:text-base">My Grades</div>
                <div className="text-xs sm:text-sm text-gray-600">View your grades</div>
              </div>
            </Link>

            <Link
              href="/programmes"
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg hover:bg-indigo-50 transition-colors group min-h-[44px]"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors flex-shrink-0">
                <Icon icon="material-symbols:school" className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 text-sm sm:text-base">Programmes</div>
                <div className="text-xs sm:text-sm text-gray-600">View learning paths</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* My Programmes */}
      <MyProgrammesWidget />

      {/* Student Tools & Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student Tools - Quick Links */}
        <div className="lg:col-span-1">
          <StudentToolsWidget />
        </div>

        {/* Adaptive Learning */}
        <div className="lg:col-span-1">
          <AdaptiveLearningWidget />
        </div>

        {/* Calendar Preview */}
        <div className="lg:col-span-1">
          <CalendarPreviewWidget />
        </div>

        {/* Tasks Preview */}
        <div className="lg:col-span-1">
          <TasksPreviewWidget />
        </div>
      </div>

      {/* My Grades - Real-time, organized by course */}
      {courseIds.length > 0 && (
        <MyGradesWidget
          courseIds={courseIds}
          userId={user.id}
          initialGrades={recentGrades}
        />
      )}

      {/* Pending Assignments */}
      {availableAssignments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 sm:px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Pending Assignments
            </h3>
            <p className="text-orange-100 text-sm">Complete these assignments to stay on track</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {availableAssignments.slice(0, 3).map((assignment: any) => (
                <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{assignment.title}</h4>
                    {assignment.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{assignment.description}</p>
                    )}
                    {assignment.due_date && (
                      <p className="text-xs text-orange-600 mt-2">
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Link 
                    href={`/assignment/${assignment.id}`}
                    className="w-full sm:w-auto sm:ml-4 px-4 py-2.5 min-h-[44px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium text-center flex items-center justify-center flex-shrink-0"
                  >
                    Start Assignment
                  </Link>
                </div>
              ))}
              {availableAssignments.length > 3 && (
                <div className="text-center pt-2">
                  <Link 
                    href="/assignments"
                    className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                  >
                    View all {availableAssignments.length} assignments →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Quizzes */}
      {availableQuizzes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 sm:px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending Quizzes
            </h3>
            <p className="text-purple-100 text-sm">Test your knowledge with these quizzes</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {availableQuizzes.slice(0, 3).map((quiz: any) => (
                <div key={quiz.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{quiz.title}</h4>
                    {quiz.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{quiz.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-purple-600">
                      <span>Questions: {quiz.questions?.[0]?.count ?? 'N/A'}</span>
                      <span>Duration: {quiz.time_limit ? `${quiz.time_limit} min` : 'No limit'}</span>
                    </div>
                  </div>
                  <Link 
                    href={`/quiz/${quiz.id}/attempt`}
                    className="w-full sm:w-auto sm:ml-4 px-4 py-2.5 min-h-[44px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium text-center flex items-center justify-center flex-shrink-0"
                  >
                    Take Quiz
                  </Link>
                </div>
              ))}
              {availableQuizzes.length > 3 && (
                <div className="text-center pt-2">
                  <Link 
                    href="/quizzes"
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    View all {availableQuizzes.length} quizzes →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Discussions */}
      {recentDiscussions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-4 sm:px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Recent Discussions
            </h3>
            <p className="text-green-100 text-sm">Join the conversation in your courses</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {recentDiscussions.slice(0, 3).map((discussion: any) => (
                <div key={discussion.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{discussion.title}</h4>
                    {discussion.content && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{discussion.content.substring(0, 100)}...</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-green-600">
                      <span>Course: {discussion.courses?.title || 'Unknown'}</span>
                      <span>Replies: {discussion.reply_count || 0}</span>
                    </div>
                  </div>
                  <Link 
                    href={`/course/${discussion.course_id}/discussions/${discussion.id}`}
                    className="w-full sm:w-auto sm:ml-4 px-4 py-2.5 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium text-center flex items-center justify-center flex-shrink-0"
                  >
                    Join Discussion
                  </Link>
                </div>
              ))}
              {recentDiscussions.length > 3 && (
                <div className="text-center pt-2">
                  <Link 
                    href="/discussions"
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    View all {recentDiscussions.length} discussions →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function InstructorView() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();
  
  // Get instructor's classes
  const { data: classes } = await supabase
    .from('classes')
    .select(`
      *,
      course_instructors!inner(instructor_id),
      courses(*)
    `)
    .eq('course_instructors.instructor_id', user.id);

  const classCount = classes?.length || 0;

  // Get pending assignments to grade (only for instructor's assignments)
  let pendingCount = 0;
  
  // Get assignments created by this instructor
  const { data: createdAssignments } = await serviceSupabase
    .from('assignments')
    .select('id')
    .eq('creator_id', user.id)
    .eq('published', true);

  // Get assignments in instructor's courses (via lessons)
  const courseIds = classes?.map(c => c.courses?.id).filter(Boolean) || [];
  let courseAssignments: any[] = [];
  
  if (courseIds.length > 0) {
    const { data: lessons } = await serviceSupabase
      .from('lessons')
      .select('id')
      .in('course_id', courseIds);
    
    if (lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      const { data: assignments } = await serviceSupabase
        .from('assignments')
        .select('id')
        .in('lesson_id', lessonIds)
        .eq('published', true);
      
      courseAssignments = assignments || [];
    }
  }

  // Combine all assignment IDs
  const allAssignmentIds = [
    ...(createdAssignments || []).map(a => a.id),
    ...courseAssignments.map(a => a.id)
  ];

  if (allAssignmentIds.length > 0) {
    // Get pending submissions for these assignments
    const { data: pendingGrading, error: pendingError } = await serviceSupabase
      .from('assignment_submissions')
      .select(`
        *,
        assignments(*)
      `)
      .in('assignment_id', allAssignmentIds)
      .eq('status', 'submitted')
      .limit(10);

    pendingCount = pendingGrading?.length || 0;
  }

  // Additional debug: Check ALL submitted assignments (regardless of ownership)
  const { data: allSubmittedAssignments, error: allSubmittedError } = await serviceSupabase
    .from('assignment_submissions')
    .select(`
      *,
      assignments(*)
    `)
    .eq('status', 'submitted')
    .limit(5);

  // Get total students across all classes
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*')
    .in('course_id', classes?.map(c => c.courses?.id).filter(Boolean) || []);

  const studentCount = enrollments?.length || 0;

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{classCount}</p>
              <p className="text-sm text-gray-600">Active Classes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-600">Pending Grading</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{studentCount}</p>
              <p className="text-sm text-gray-600">Total Students</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Teaching Tools
          </h3>
          <p className="text-orange-100 text-sm">Manage your courses and students</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              href="/assignments" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-purple-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Assignments</div>
                <div className="text-sm text-gray-600">Manage assignments</div>
              </div>
            </Link>

            <Link 
              href="/courses/create" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-blue-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Create Course</div>
                <div className="text-sm text-gray-600">Build new content</div>
              </div>
            </Link>

            <Link 
              href="/lessons/create" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-green-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Create Lesson</div>
                <div className="text-sm text-gray-600">Add new content</div>
              </div>
            </Link>

            <Link
              href="/classes/create"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-indigo-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Create Class</div>
                <div className="text-sm text-gray-600">Start new session</div>
              </div>
            </Link>

            <Link
              href="/surveys"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-teal-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Surveys</div>
                <div className="text-sm text-gray-600">Course evaluations</div>
              </div>
            </Link>

            <Link
              href="/admin/discussions"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-green-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Course Discussions</div>
                <div className="text-sm text-gray-600">Manage graded discussions</div>
              </div>
            </Link>

            <Link
              href="/discussions"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-blue-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Community Forum</div>
                <div className="text-sm text-gray-600">Global discussions</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Lecturer Collaboration Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Lecturer Collaboration
          </h3>
          <p className="text-indigo-100 text-sm">Connect, share, and collaborate with fellow educators</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/lecturers/forums" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-blue-50 transition-colors group border border-gray-200 hover:border-blue-300"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Icon icon="mdi:forum" className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 group-hover:text-blue-700">Forums</div>
                <div className="text-sm text-gray-600">Join discussions and share teaching strategies</div>
              </div>
              <Icon icon="material-symbols:arrow-forward" className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </Link>

            <Link 
              href="/lecturers/resources" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-green-50 transition-colors group border border-gray-200 hover:border-green-300"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Icon icon="mdi:folder-share" className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 group-hover:text-green-700">Resource Library</div>
                <div className="text-sm text-gray-600">Share and discover teaching materials</div>
              </div>
              <Icon icon="material-symbols:arrow-forward" className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
            </Link>

            <Link 
              href="/lecturers/chat" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-purple-50 transition-colors group border border-gray-200 hover:border-purple-300"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Icon icon="mdi:chat" className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 group-hover:text-purple-700">Staff Room</div>
                <div className="text-sm text-gray-600">Real-time chat with colleagues</div>
              </div>
              <Icon icon="material-symbols:arrow-forward" className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

async function AdminView(role: string) {
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();
  
  // Get system statistics
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true });

  const { count: lessonCount } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true });

  const { count: enrollmentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true });

  const { count: certificateCount } = await serviceSupabase
    .from('certificates')
    .select('*', { count: 'exact', head: true });

  // Tenant stats for super_admin only
  let tenantCount: number | null = null;
  let activeTenantCount: number | null = null;
  if (role === 'super_admin') {
    const { count: tc } = await serviceSupabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });
    const { count: atc } = await serviceSupabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    tenantCount = tc;
    activeTenantCount = atc;
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className={`grid grid-cols-2 md:grid-cols-4 ${role === 'super_admin' ? 'lg:grid-cols-7' : 'lg:grid-cols-5'} gap-4`}>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{userCount || 0}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{courseCount || 0}</p>
              <p className="text-sm text-gray-600">Courses</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{lessonCount || 0}</p>
              <p className="text-sm text-gray-600">Lessons</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{enrollmentCount || 0}</p>
              <p className="text-sm text-gray-600">Enrollments</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{certificateCount || 0}</p>
              <p className="text-sm text-gray-600">Certificates Issued</p>
            </div>
          </div>
        </div>

        {role === 'super_admin' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Icon icon="material-symbols:domain" className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{tenantCount || 0}</p>
                <p className="text-sm text-gray-600">Tenants</p>
              </div>
            </div>
          </div>
        )}

        {role === 'super_admin' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Icon icon="material-symbols:verified" className="w-6 h-6 text-cyan-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{activeTenantCount || 0}</p>
                <p className="text-sm text-gray-600">Active Tenants</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Tools - Organized by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tenant Management - Super Admin Only */}
        {role === 'super_admin' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Icon icon="material-symbols:domain" className="w-5 h-5 mr-2" />
                Tenant Management
              </h3>
              <p className="text-emerald-100 text-sm">Multi-tenant administration</p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <Link
                  href="/admin/system"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-50 transition-colors group"
                >
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                    <Icon icon="material-symbols:monitoring" className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">System Dashboard</div>
                    <div className="text-sm text-gray-600">Cross-tenant overview and stats</div>
                  </div>
                </Link>

                <Link
                  href="/admin/tenants"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-teal-50 transition-colors group"
                >
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                    <Icon icon="material-symbols:apartment" className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Manage Tenants</div>
                    <div className="text-sm text-gray-600">View, edit, and manage all tenants</div>
                  </div>
                </Link>

                <Link
                  href="/admin/tenants/create"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-cyan-50 transition-colors group"
                >
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                    <Icon icon="material-symbols:add-business" className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Create Tenant</div>
                    <div className="text-sm text-gray-600">Add a new tenant organization</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              User Management
            </h3>
            <p className="text-blue-100 text-sm">Manage users and accounts</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link 
                href="/admin/users/manage" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Manage Users</div>
                  <div className="text-sm text-gray-600">User accounts and permissions</div>
                </div>
              </Link>
              
              <Link 
                href="/admin/at-risk-students" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">At-Risk Students</div>
                  <div className="text-sm text-gray-600">Identify and support struggling students</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Course Management */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Course Management
            </h3>
            <p className="text-green-100 text-sm">Manage courses and content</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link
                href="/admin/courses/manage"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Manage Courses</div>
                  <div className="text-sm text-gray-600">Course content and settings</div>
                </div>
              </Link>

              <Link
                href="/admin/categories"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-teal-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Course Categories</div>
                  <div className="text-sm text-gray-600">Organize courses into categories</div>
                </div>
              </Link>

              <Link
                href="/admin/programmes"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Programmes</div>
                  <div className="text-sm text-gray-600">Multi-course learning paths</div>
                </div>
              </Link>

              <Link
                href="/lessons/create"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Create Lesson</div>
                  <div className="text-sm text-gray-600">Add new lesson content</div>
                </div>
              </Link>

              <Link
                href="/manage-lessons"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-lime-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-lime-100 rounded-lg flex items-center justify-center group-hover:bg-lime-200 transition-colors">
                  <svg className="w-4 h-4 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Manage Lessons</div>
                  <div className="text-sm text-gray-600">View and edit all lessons</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Assessment Management */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Assessment Management
            </h3>
            <p className="text-purple-100 text-sm">Quizzes, assignments, and questions</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link 
                href="/assignments" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Manage Assignments</div>
                  <div className="text-sm text-gray-600">View and grade assignments</div>
                </div>
              </Link>

              <Link 
                href="/quizzes" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-yellow-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Manage Quizzes</div>
                  <div className="text-sm text-gray-600">Create and manage quizzes</div>
                </div>
              </Link>

              <Link
                href="/admin/question-banks"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Question Banks</div>
                  <div className="text-sm text-gray-600">Shared question repositories</div>
                </div>
              </Link>

              <Link
                href="/surveys"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-teal-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Surveys & Evaluations</div>
                  <div className="text-sm text-gray-600">Course feedback and evaluations</div>
                </div>
              </Link>

              <Link
                href="/admin/discussions"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Course Discussions</div>
                  <div className="text-sm text-gray-600">Graded and ungraded discussions</div>
                </div>
              </Link>

              <Link
                href="/discussions"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Community Forum</div>
                  <div className="text-sm text-gray-600">Global discussions</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Analytics & Reporting */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics & Reporting
            </h3>
            <p className="text-indigo-100 text-sm">Data insights and reports</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link 
                href="/admin/analytics" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Analytics Dashboard</div>
                  <div className="text-sm text-gray-600">View learning analytics and insights</div>
                </div>
              </Link>

              <Link 
                href="/admin/reports" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Custom Reports</div>
                  <div className="text-sm text-gray-600">Build and run custom reports</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Communication */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              Communication
            </h3>
            <p className="text-amber-100 text-sm">Announcements and messaging</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link 
                href="/admin/announcements" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Announcements</div>
                  <div className="text-sm text-gray-600">Manage system-wide announcements</div>
                </div>
              </Link>

              <Link 
                href="/admin/notifications/send" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Icon icon="material-symbols:send" className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Send Notification</div>
                  <div className="text-sm text-gray-600">Send WhatsApp, SMS, Email, or Push notifications</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Certifications
            </h3>
            <p className="text-pink-100 text-sm">Certificates and achievements</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link 
                href="/admin/certificates/templates" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Certificate Templates</div>
                  <div className="text-sm text-gray-600">Design and manage templates</div>
                </div>
              </Link>

              <Link 
                href="/admin/certificates/manage" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-pink-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                  <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Manage Certificates</div>
                  <div className="text-sm text-gray-600">View and manage issued certificates</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* SIS Integration */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              SIS Integration
            </h3>
            <p className="text-violet-100 text-sm">Student Information System sync</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link
                href="/admin/sonisweb"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-violet-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                  <Icon icon="material-symbols:sync" className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">SonisWeb Connections</div>
                  <div className="text-sm text-gray-600">Manage SOAP API connections and sync</div>
                </div>
              </Link>

              <Link
                href="/admin/sonisweb#xml-import"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Icon icon="material-symbols:upload-file" className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">XML Import</div>
                  <div className="text-sm text-gray-600">Import users and courses from IMS Enterprise XML</div>
                </div>
              </Link>

              <Link
                href="/admin/sonisweb#sync-logs"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-fuchsia-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-fuchsia-100 rounded-lg flex items-center justify-center group-hover:bg-fuchsia-200 transition-colors">
                  <Icon icon="material-symbols:history" className="w-4 h-4 text-fuchsia-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Sync History</div>
                  <div className="text-sm text-gray-600">View sync logs and import results</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Integrations
            </h3>
            <p className="text-teal-100 text-sm">External tools and services</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link 
                href="/admin/lti-tools" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-teal-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">LTI Tools</div>
                  <div className="text-sm text-gray-600">Manage external integrations</div>
                </div>
              </Link>
              <Link
                href="/admin/lti-platforms"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">LTI Platforms</div>
                  <div className="text-sm text-gray-600">Configure platforms that launch this LMS</div>
                </div>
              </Link>

              <Link
                href="/admin/proctoring-services"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <Icon icon="material-symbols:security" className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Proctoring Services</div>
                  <div className="text-sm text-gray-600">Configure Respondus, ProctorU, and more</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-600 to-slate-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              System Settings
            </h3>
            <p className="text-gray-100 text-sm">Platform configuration</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Platform Settings</div>
                  <div className="text-sm text-gray-600">Configure system settings</div>
                </div>
              </Link>

              <Link
                href="/admin/adaptive-rules"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Icon icon="material-symbols:psychology" className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Adaptive Learning Rules</div>
                  <div className="text-sm text-gray-600">Configure personalization rules</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              System Health
            </h3>
            <p className="text-green-100 text-sm">Monitor system status</p>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <div className="font-medium text-gray-900">All Systems Operational</div>
                <div className="text-sm text-gray-600">Database, API, and services running normally</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function DesignerView() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  
  // Get curriculum designer's courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('created_by', user.id);

  const courseCount = courses?.length || 0;

  // Get lessons created by designer
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('created_by', user.id);

  const lessonCount = lessons?.length || 0;

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{courseCount}</p>
              <p className="text-sm text-gray-600">Courses Created</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{lessonCount}</p>
              <p className="text-sm text-gray-600">Lessons Created</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">Active</p>
              <p className="text-sm text-gray-600">Design Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Design Tools */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            Design Tools
          </h3>
          <p className="text-purple-100 text-sm">Create and manage curriculum content</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href="/courses/create" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-blue-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Create Course</div>
                <div className="text-sm text-gray-600">Design new curriculum</div>
              </div>
            </Link>

            <Link 
              href="/lessons/create" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-green-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Create Lesson</div>
                <div className="text-sm text-gray-600">Add learning content</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

async function ParentView() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  
  // Get parent's children (if any)
  const { data: children } = await supabase
    .from('users')
    .select('*')
    .eq('parent_id', user.id);

  const childCount = children?.length || 0;

  // Get total enrollments for all children
  const childIds = children?.map(child => child.id) || [];
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*')
    .in('user_id', childIds);

  const enrollmentCount = enrollments?.length || 0;

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{childCount}</p>
              <p className="text-sm text-gray-600">Children Monitored</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{enrollmentCount}</p>
              <p className="text-sm text-gray-600">Total Enrollments</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-600">New Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Parent Tools */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Parent Tools
          </h3>
          <p className="text-pink-100 text-sm">Monitor your children's learning progress</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/parent/progress" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-blue-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Progress Reports</div>
                <div className="text-sm text-gray-600">View learning progress</div>
              </div>
            </Link>

            <Link 
              href="/parent/messages" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-green-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Messages</div>
                <div className="text-sm text-gray-600">Communicate with teachers</div>
              </div>
            </Link>

            <Link 
              href="/parent/calendar" 
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-purple-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Calendar</div>
                <div className="text-sm text-gray-600">View important dates</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
