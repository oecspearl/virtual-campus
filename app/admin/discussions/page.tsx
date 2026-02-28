'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';

// Strip HTML tags from content
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_graded: boolean;
  points?: number;
  due_date?: string;
  created_at: string;
  course_id: string;
  course_title?: string;
  author_name?: string;
  reply_count?: number;
}

interface Course {
  id: string;
  title: string;
}

export default function ManageCourseDiscussionsPage() {
  const { user, supabase } = useSupabase();
  const router = useRouter();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAuthorized = userRole && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userRole);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/auth/profile', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
              const profile = await res.json();
              setUserRole(profile?.role || 'student');
              return;
            }
          }
          setUserRole(user.user_metadata?.role || 'student');
        } catch (error) {
          console.error('Error fetching profile:', error);
          setUserRole(user.user_metadata?.role || 'student');
        }
      }
    };
    fetchUserProfile();
  }, [user, supabase]);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all courses (for filter dropdown)
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');

      setCourses(coursesData || []);

      // Fetch all course discussions with course info
      const { data: discussionsData } = await supabase
        .from('course_discussions')
        .select(`
          id,
          title,
          content,
          is_pinned,
          is_locked,
          is_graded,
          points,
          due_date,
          created_at,
          course_id,
          courses(title),
          users!course_discussions_author_id_fkey(name),
          discussion_replies(count)
        `)
        .order('created_at', { ascending: false });

      if (discussionsData) {
        const formattedDiscussions = discussionsData.map((d: any) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          is_pinned: d.is_pinned,
          is_locked: d.is_locked,
          is_graded: d.is_graded,
          points: d.points,
          due_date: d.due_date,
          created_at: d.created_at,
          course_id: d.course_id,
          course_title: d.courses?.title,
          author_name: d.users?.name,
          reply_count: d.discussion_replies?.[0]?.count || 0
        }));
        setDiscussions(formattedDiscussions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDiscussions = selectedCourse === 'all'
    ? discussions
    : discussions.filter(d => d.course_id === selectedCourse);

  const handleDelete = async (discussionId: string) => {
    if (deletingId) return;
    setDeletingId(discussionId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('You must be logged in to delete discussions');
        return;
      }

      const res = await fetch(`/api/discussions/${discussionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete discussion');
      }

      // Remove from local state
      setDiscussions(prev => prev.filter(d => d.id !== discussionId));
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error('Error deleting discussion:', error);
      alert(error.message || 'Failed to delete discussion');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (discussion: Discussion) => {
    router.push(`/course/${discussion.course_id}/discussions/${discussion.id}?edit=true`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Icon icon="material-symbols:login" className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800">Please sign in</h2>
          <p className="text-yellow-700">You need to be signed in to view this page.</p>
        </div>
      </div>
    );
  }

  if (userRole && !isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Icon icon="material-symbols:lock" className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
          <p className="text-red-700">You don't have permission to manage course discussions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Manage Course Discussions</h1>
        </div>
        <p className="text-gray-600">View and manage discussions across all courses</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Icon icon="material-symbols:filter-list" className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by course:</span>
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Courses ({discussions.length})</option>
            {courses.map(course => {
              const count = discussions.filter(d => d.course_id === course.id).length;
              return (
                <option key={course.id} value={course.id}>
                  {course.title} ({count})
                </option>
              );
            })}
          </select>

          <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Icon icon="material-symbols:chat" className="w-4 h-4" />
              {filteredDiscussions.length} discussions
            </span>
            <span className="flex items-center gap-1">
              <Icon icon="material-symbols:grade" className="w-4 h-4 text-amber-500" />
              {filteredDiscussions.filter(d => d.is_graded).length} graded
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon icon="material-symbols:lightbulb" className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">Quick Actions</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/discussions"
            className="text-sm text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <Icon icon="material-symbols:forum" className="w-4 h-4" />
            Community Discussions
          </Link>
          <span className="text-blue-300">|</span>
          <Link
            href="/courses"
            className="text-sm text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <Icon icon="material-symbols:school" className="w-4 h-4" />
            View All Courses
          </Link>
        </div>
      </div>

      {/* Discussions List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : filteredDiscussions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Icon icon="material-symbols:chat-bubble-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No discussions found</h3>
          <p className="text-gray-500">
            {selectedCourse === 'all'
              ? 'There are no course discussions yet.'
              : 'This course has no discussions.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDiscussions.map((discussion) => (
            <div
              key={discussion.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/course/${discussion.course_id}/discussions/${discussion.id}`)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.is_pinned && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        <Icon icon="material-symbols:push-pin" className="w-3 h-3 mr-1" />
                        Pinned
                      </span>
                    )}
                    {discussion.is_graded && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        <Icon icon="material-symbols:grade" className="w-3 h-3 mr-1" />
                        Graded ({discussion.points} pts)
                      </span>
                    )}
                    {discussion.is_locked && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        <Icon icon="material-symbols:lock" className="w-3 h-3 mr-1" />
                        Locked
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                    {discussion.title}
                  </h3>

                  {/* Description preview - HTML stripped */}
                  {discussion.content && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {stripHtml(discussion.content).substring(0, 150)}
                      {stripHtml(discussion.content).length > 150 ? '...' : ''}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:school" className="w-4 h-4" />
                      {discussion.course_title || 'Unknown Course'}
                    </span>
                    <span>•</span>
                    <span>by {discussion.author_name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDate(discussion.created_at)}</span>
                  </div>

                  {discussion.due_date && (
                    <div className="mt-2 text-sm text-orange-600 flex items-center gap-1">
                      <Icon icon="material-symbols:event" className="w-4 h-4" />
                      Due: {formatDate(discussion.due_date)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  {/* Reply count */}
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Icon icon="material-symbols:chat" className="w-4 h-4" />
                    {discussion.reply_count} replies
                  </span>

                  {/* Action buttons - only for admins/instructors */}
                  {isAuthorized && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(discussion);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit discussion"
                      >
                        <Icon icon="material-symbols:edit" className="w-5 h-5" />
                      </button>

                      {deleteConfirmId === discussion.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(discussion.id);
                            }}
                            disabled={deletingId === discussion.id}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === discussion.id ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(discussion.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete discussion"
                        >
                          <Icon icon="material-symbols:delete" className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
