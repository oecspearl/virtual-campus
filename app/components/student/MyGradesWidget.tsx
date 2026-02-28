'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

interface GradeItem {
  title: string;
  type: string;
  category: string;
  points: number;
}

interface Course {
  id: string;
  title: string;
}

interface Grade {
  id: string;
  score: number;
  max_score: number;
  percentage: number;
  graded_at: string | null;
  grade_item: GradeItem | null;
  course: Course | null;
  course_id: string;
}

interface CourseGrades {
  course: Course;
  grades: Grade[];
  averagePercentage: number;
}

interface MyGradesWidgetProps {
  courseIds: string[];
  userId: string;
  initialGrades?: Grade[];
}

export default function MyGradesWidget({
  courseIds,
  userId,
  initialGrades = []
}: MyGradesWidgetProps) {
  const [grades, setGrades] = useState<Grade[]>(initialGrades);
  const [loading, setLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch grades from API
  const fetchGrades = useCallback(async () => {
    if (courseIds.length === 0) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/student/grades?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGrades(data.grades || []);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  }, [courseIds]);

  // Refresh on visibility change and focus (only after mount)
  useEffect(() => {
    if (!hasMounted) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchGrades();
      }
    };

    const handleFocus = () => {
      fetchGrades();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Also refresh every 2 minutes while page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchGrades();
      }
    }, 120000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchGrades, hasMounted]);

  // Group grades by course
  const gradesByCourse = useMemo(() => {
    const courseMap = new Map<string, CourseGrades>();

    grades.forEach(grade => {
      const courseId = grade.course_id;
      const course = grade.course || { id: courseId, title: 'Unknown Course' };

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          course,
          grades: [],
          averagePercentage: 0
        });
      }

      courseMap.get(courseId)!.grades.push(grade);
    });

    // Calculate average percentage for each course and sort grades by date
    courseMap.forEach(courseGrades => {
      courseGrades.grades.sort((a, b) => {
        const dateA = a.graded_at ? new Date(a.graded_at).getTime() : 0;
        const dateB = b.graded_at ? new Date(b.graded_at).getTime() : 0;
        return dateB - dateA;
      });

      const validGrades = courseGrades.grades.filter(g => g.grade_item?.points > 0);
      if (validGrades.length > 0) {
        const totalPercentage = validGrades.reduce((sum, g) => {
          const pct = g.grade_item!.points > 0
            ? (g.score / g.grade_item!.points) * 100
            : 0;
          return sum + pct;
        }, 0);
        courseGrades.averagePercentage = Math.round(totalPercentage / validGrades.length);
      }
    });

    // Sort courses by name
    return Array.from(courseMap.values()).sort((a, b) =>
      a.course.title.localeCompare(b.course.title)
    );
  }, [grades]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeBg = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 border-green-200';
    if (percentage >= 80) return 'bg-blue-100 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 px-4 sm:px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            My Grades
          </h3>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
          <span className="ml-3 text-gray-600">Loading grades...</span>
        </div>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 px-4 sm:px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            My Grades
          </h3>
        </div>
        <div className="p-6 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No grades yet. Complete quizzes and assignments to see your grades here.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="my-grades" className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-600 to-amber-600 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              My Grades
            </h3>
            <p className="text-yellow-100 text-sm">Your grades organized by course</p>
          </div>
          {hasMounted && lastUpdated && (
            <div className="text-yellow-200 text-xs hidden sm:block">
              Updated {lastUpdated}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="space-y-4">
          {gradesByCourse.map(({ course, grades: courseGrades, averagePercentage }) => {
            const isExpanded = expandedCourses.has(course.id);
            const displayGrades = isExpanded ? courseGrades : courseGrades.slice(0, 3);
            const hasMore = courseGrades.length > 3;

            return (
              <div key={course.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Course Header */}
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{course.title}</h4>
                      <p className="text-sm text-gray-500">
                        {courseGrades.length} graded item{courseGrades.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeBg(averagePercentage)} ${getGradeColor(averagePercentage)}`}>
                      {averagePercentage}% avg
                    </div>
                    <Link
                      href={`/courses/${course.id}/gradebook`}
                      className="text-yellow-600 hover:text-yellow-700 text-sm font-medium hidden sm:block"
                    >
                      View All
                    </Link>
                  </div>
                </div>

                {/* Grades List */}
                <div className="divide-y divide-gray-100">
                  {displayGrades.map(grade => {
                    const gradeItem = grade.grade_item || { title: 'Untitled', type: 'other', points: 0, category: '' };
                    const percentage = gradeItem.points > 0
                      ? Math.round((grade.score / gradeItem.points) * 100)
                      : 0;

                    return (
                      <div key={grade.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            gradeItem.type === 'quiz' ? 'bg-purple-100' :
                            gradeItem.type === 'assignment' ? 'bg-orange-100' : 'bg-gray-100'
                          }`}>
                            {gradeItem.type === 'quiz' ? (
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : gradeItem.type === 'assignment' ? (
                              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{gradeItem.title}</p>
                            <p className="text-xs text-gray-500">
                              {gradeItem.type.charAt(0).toUpperCase() + gradeItem.type.slice(1)}
                              {grade.graded_at && ` • ${new Date(grade.graded_at).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className="flex items-center gap-1">
                            <span className="text-lg font-bold text-gray-900">{grade.score}</span>
                            <span className="text-sm text-gray-500">/{gradeItem.points}</span>
                          </div>
                          <span className={`text-sm font-medium ${getGradeColor(percentage)}`}>
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expand/Collapse Button */}
                {hasMore && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => toggleCourse(course.id)}
                      className="w-full text-center text-sm text-yellow-600 hover:text-yellow-700 font-medium py-1"
                    >
                      {isExpanded
                        ? 'Show less'
                        : `Show ${courseGrades.length - 3} more grade${courseGrades.length - 3 !== 1 ? 's' : ''}`
                      }
                    </button>
                  </div>
                )}

                {/* Mobile View All Link */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 sm:hidden">
                  <Link
                    href={`/courses/${course.id}/gradebook`}
                    className="block w-full text-center text-sm text-yellow-600 hover:text-yellow-700 font-medium py-1"
                  >
                    View Full Gradebook
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Refresh indicator */}
        <div className="mt-4 text-center">
          <button
            onClick={fetchGrades}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh grades
          </button>
        </div>
      </div>
    </div>
  );
}
