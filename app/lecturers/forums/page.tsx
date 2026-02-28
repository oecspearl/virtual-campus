'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { hasRole } from '@/lib/rbac';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/Button';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

interface Forum {
  id: string;
  title: string;
  description: string | null;
  category: string;
  subject_area: string | null;
  created_by: string;
  created_by_user: {
    id: string;
    name: string;
    email: string;
  };
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  view_count: number;
  post_count: { count: number }[];
  created_at: string;
  updated_at: string;
}

const FORUM_CATEGORIES = [
  { value: 'general', label: 'General Discussion', icon: 'mdi:forum' },
  { value: 'subject-specific', label: 'Subject-Specific', icon: 'mdi:book-open-variant' },
  { value: 'best-practices', label: 'Best Practices', icon: 'mdi:lightbulb-on' },
  { value: 'problem-solving', label: 'Problem Solving', icon: 'mdi:puzzle' },
];

export default function LecturerForumsPage() {
  const { user, supabase } = useSupabase();
  const router = useRouter();
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newForum, setNewForum] = useState({
    title: '',
    description: '',
    category: 'general',
    subject_area: '',
  });

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/auth/profile', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
              const profile = await res.json();
              setUserRole(profile?.role || user.user_metadata?.role || 'student');
              setRoleLoading(false);
              return;
            }
          }
          // Fallback to user_metadata
          setUserRole(user.user_metadata?.role || 'student');
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(user.user_metadata?.role || 'student');
        }
      }
      setRoleLoading(false);
    };

    fetchUserRole();
  }, [user, supabase]);

  useEffect(() => {
    if (roleLoading) return;
    
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      router.push('/dashboard');
      return;
    }

    if (userRole && hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      fetchForums();
    }
  }, [user, userRole, roleLoading, selectedCategory]);

  const fetchForums = async () => {
    try {
      setLoading(true);
      const url = selectedCategory
        ? `/api/lecturers/forums?category=${selectedCategory}`
        : '/api/lecturers/forums';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch forums');
      const data = await response.json();
      setForums(data.forums || []);
    } catch (err: any) {
      console.error('Error fetching forums:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/lecturers/forums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newForum,
          subject_area: newForum.subject_area || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create forum');
      }

      setShowCreateModal(false);
      setNewForum({ title: '', description: '', category: 'general', subject_area: '' });
      fetchForums();
    } catch (err: any) {
      console.error('Error creating forum:', err);
      alert(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPostCount = (forum: Forum) => {
    return (forum.post_count as any)?.[0]?.count || 0;
  };

  if (roleLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Lecturer Forums
              </h1>
              <p className="text-gray-600">
                Connect, collaborate, and exchange ideas with fellow lecturers
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
            >
              <Icon icon="mdi:plus" className="mr-2" />
              Create Forum
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-[#0066CC] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Forums
            </button>
            {FORUM_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === cat.value
                    ? 'bg-[#0066CC] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon icon={cat.icon} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Forums List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error}
          </div>
        ) : forums.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Icon icon="mdi:forum-outline" className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No forums yet</h3>
            <p className="text-gray-500 mb-6">Be the first to create a forum!</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
            >
              Create First Forum
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {forums.map((forum) => (
              <motion.div
                key={forum.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/lecturers/forums/${forum.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {forum.is_pinned && (
                        <Icon icon="mdi:pin" className="text-[#0066CC]" />
                      )}
                      <h3 className="text-xl font-semibold text-gray-900">{forum.title}</h3>
                      {forum.is_locked && (
                        <Icon icon="mdi:lock" className="text-gray-400" />
                      )}
                    </div>
                    {forum.description && (
                      <p className="text-gray-600 mb-4">{forum.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:account" />
                        {forum.created_by_user?.name || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:comment-outline" />
                        {getPostCount(forum)} posts
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:eye-outline" />
                        {forum.view_count || 0} views
                      </span>
                      <span>{formatDate(forum.created_at)}</span>
                    </div>
                  </div>
                  <Icon
                    icon="mdi:chevron-right"
                    className="text-gray-400 text-2xl ml-4"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Forum Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Forum</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mdi:close" className="text-2xl" />
                </button>
              </div>

              <form onSubmit={handleCreateForum} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forum Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newForum.title}
                    onChange={(e) => setNewForum({ ...newForum, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                    placeholder="e.g., Mathematics Teaching Strategies"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newForum.description}
                    onChange={(e) => setNewForum({ ...newForum, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                    placeholder="Describe what this forum is about..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={newForum.category}
                    onChange={(e) => setNewForum({ ...newForum, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                  >
                    {FORUM_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {newForum.category === 'subject-specific' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Area
                    </label>
                    <input
                      type="text"
                      value={newForum.subject_area}
                      onChange={(e) => setNewForum({ ...newForum, subject_area: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                      placeholder="e.g., Mathematics, Science, History"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white"
                  >
                    Create Forum
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

