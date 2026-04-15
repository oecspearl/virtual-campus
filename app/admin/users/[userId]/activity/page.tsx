'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

interface Activity {
  id: string;
  student_id: string;
  course_id: string | null;
  activity_type: string;
  item_id: string | null;
  item_type: string | null;
  action: string;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  courses?: {
    id: string;
    title: string;
  } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LessonProgress {
  lesson_id: string;
  lesson_title: string;
  lesson_order: number;
  status: string;
  completed_at: string | null;
  content_items_completed: number;
  content_items_total: number;
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  enrolled_at: string;
  lessons_total: number;
  lessons_completed: number;
  percentage: number;
  lessons: LessonProgress[];
}

interface ProgressSummary {
  total_courses: number;
  total_lessons: number;
  completed_lessons: number;
  overall_percentage: number;
}

type TabType = 'activity' | 'progress';

export default function StudentActivityPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { supabase } = useSupabase();
  const userId = params.userId;

  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadUserAndActivities();
  }, [userId, selectedCourse, offset]);

  useEffect(() => {
    if (activeTab === 'progress' && courses.length === 0 && !progressLoading) {
      loadProgress();
    }
  }, [activeTab]);

  const loadUserAndActivities = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      // Fetch user info
      const userResponse = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user || userData);
      }

      // Fetch activities
      let url = `/api/activity/${userId}?limit=${limit}&offset=${offset}`;
      if (selectedCourse) {
        url += `&courseId=${selectedCourse}`;
      }

      const activitiesResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (activitiesResponse.ok) {
        const data = await activitiesResponse.json();
        setActivities(data.activities || []);
        setTotal(data.total || 0);
      } else {
        const errorData = await activitiesResponse.json();
        throw new Error(errorData.error || 'Failed to load activities');
      }
    } catch (err: any) {
      console.error('Error loading activities:', err);
      setError(err.message || 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      setProgressLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/users/${userId}/progress`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error loading progress:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  const exportCSV = async (format: 'lessons' | 'content') => {
    try {
      setExporting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/users/${userId}/progress/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `progress_${user?.name?.replace(/\s+/g, '_') || userId}_${format}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  const toggleCourseExpanded = (courseId: string) => {
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

  const formatActivityType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActivityIcon = (activityType: string) => {
    if (activityType.includes('course')) {
      return 'material-symbols:school';
    } else if (activityType.includes('lesson')) {
      return 'material-symbols:book';
    } else if (activityType.includes('quiz')) {
      return 'material-symbols:quiz';
    } else if (activityType.includes('assignment')) {
      return 'material-symbols:assignment';
    }
    return 'material-symbols:history';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <Icon icon="material-symbols:check-circle" className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <Icon icon="material-symbols:pending" className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            Not Started
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <LoadingIndicator variant="pulse" text="Loading..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard
      roles={['admin', 'super_admin', 'instructor', 'curriculum_designer']}
      fallback={
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <p className="text-red-600">Access Denied</p>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="mb-4"
            >
              <Icon icon="material-symbols:arrow-back" className="w-5 h-5 mr-2" />
              Back
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-2">
                  Student Overview
                </h1>
                {user && (
                  <p className="text-gray-600">
                    {user.name} ({user.email})
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon icon="material-symbols:history" className="w-5 h-5 inline mr-2" />
                Activity Log
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'progress'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon icon="material-symbols:trending-up" className="w-5 h-5 inline mr-2" />
                Student Progress
              </button>
            </nav>
          </div>

          {activeTab === 'activity' && (
            <>
              {/* Filters */}
              <div className="mb-6 bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">Filter by Course:</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setOffset(0);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Courses</option>
                  </select>
                  <Button
                    onClick={() => {
                      setSelectedCourse('');
                      setOffset(0);
                    }}
                    variant="outline"
                    className="text-sm"
                  >
                    Clear Filter
                  </Button>
                </div>
              </div>

              {/* Activity List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">
                    Activities ({total} total)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  {activities.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                      <Icon icon="material-symbols:history" className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No activities found</p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {activities.map((activity) => {
                          // Extract content details from metadata
                          const contentTitle = activity.metadata?.contentTitle ||
                            activity.metadata?.lessonTitle ||
                            activity.metadata?.quizTitle ||
                            activity.metadata?.fileName ||
                            activity.metadata?.assignmentTitle ||
                            null;

                          return (
                            <tr key={activity.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(activity.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Icon
                                    icon={getActivityIcon(activity.activity_type)}
                                    className="w-5 h-5 text-gray-400"
                                  />
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatActivityType(activity.activity_type)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {activity.courses?.title || '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                <div className="flex flex-col">
                                  {activity.item_type && (
                                    <span className="capitalize text-xs text-gray-400">{activity.item_type}</span>
                                  )}
                                  {contentTitle && (
                                    <span className="font-medium text-gray-700 truncate" title={contentTitle}>
                                      {contentTitle}
                                    </span>
                                  )}
                                  {!activity.item_type && !contentTitle && '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {activity.action}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {total > limit && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} activities
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        variant="outline"
                        className="text-sm"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= total}
                        variant="outline"
                        className="text-sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'progress' && (
            <>
              {progressLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingIndicator variant="pulse" text="Loading progress..." />
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-blue-100 mr-4">
                            <Icon icon="material-symbols:school" className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Enrolled Courses</p>
                            <p className="text-2xl font-bold text-gray-900">{summary.total_courses}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-purple-100 mr-4">
                            <Icon icon="material-symbols:book" className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Lessons</p>
                            <p className="text-2xl font-bold text-gray-900">{summary.total_lessons}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-green-100 mr-4">
                            <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Completed</p>
                            <p className="text-2xl font-bold text-gray-900">{summary.completed_lessons}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-orange-100 mr-4">
                            <Icon icon="material-symbols:percent" className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Overall Progress</p>
                            <p className="text-2xl font-bold text-gray-900">{summary.overall_percentage}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div className="mb-6 flex gap-4">
                    <Button
                      onClick={() => exportCSV('lessons')}
                      disabled={exporting || courses.length === 0}
                      variant="outline"
                    >
                      <Icon icon="material-symbols:download" className="w-5 h-5 mr-2" />
                      Export Lesson Progress (CSV)
                    </Button>
                    <Button
                      onClick={() => exportCSV('content')}
                      disabled={exporting || courses.length === 0}
                      variant="outline"
                    >
                      <Icon icon="material-symbols:download" className="w-5 h-5 mr-2" />
                      Export Content Progress (CSV)
                    </Button>
                  </div>

                  {/* Course Progress List */}
                  <div className="space-y-4">
                    {courses.length === 0 ? (
                      <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Icon icon="material-symbols:school-outline" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 text-lg">Not enrolled in any courses</p>
                      </div>
                    ) : (
                      courses.map((course) => (
                        <div key={course.course_id} className="bg-white rounded-lg shadow overflow-hidden">
                          {/* Course Header */}
                          <div
                            className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleCourseExpanded(course.course_id)}
                          >
                            <div className="flex items-center gap-4">
                              <Icon
                                icon={expandedCourses.has(course.course_id) ? 'material-symbols:expand-more' : 'material-symbols:chevron-right'}
                                className="w-5 h-5 text-gray-400"
                              />
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{course.course_title}</h3>
                                <p className="text-sm text-gray-500">
                                  Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Lessons Completed</p>
                                <p className="text-lg font-semibold">
                                  {course.lessons_completed} / {course.lessons_total}
                                </p>
                              </div>
                              <div className="w-32">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">{course.percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      course.percentage === 100
                                        ? 'bg-green-500'
                                        : course.percentage > 0
                                        ? 'bg-blue-500'
                                        : 'bg-gray-300'
                                    }`}
                                    style={{ width: `${course.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lessons Table */}
                          {expandedCourses.has(course.course_id) && (
                            <div className="border-t border-gray-200">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lesson</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Items</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed At</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {course.lessons.map((lesson) => (
                                    <tr key={lesson.lesson_id} className="hover:bg-gray-50">
                                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {lesson.lesson_order}
                                      </td>
                                      <td className="px-6 py-3 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">
                                          {lesson.lesson_title}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3 whitespace-nowrap">
                                        {getStatusBadge(lesson.status)}
                                      </td>
                                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {lesson.content_items_total > 0 ? (
                                          <span>
                                            {lesson.content_items_completed} / {lesson.content_items_total}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {lesson.completed_at
                                          ? new Date(lesson.completed_at).toLocaleString()
                                          : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
