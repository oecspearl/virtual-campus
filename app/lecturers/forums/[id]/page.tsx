'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import { hasRole } from '@/lib/rbac';
import Button from '@/app/components/Button';
import TextEditor from '@/app/components/TextEditor';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { sanitizeHtml } from '@/lib/sanitize';

interface Forum {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_locked?: boolean;
  created_by_user: {
    id: string;
    name: string;
    email: string;
  };
  view_count: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  vote_count: number;
  view_count: number;
  created_at: string;
}

export default function ForumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, supabase } = useSupabase();
  const forumId = params.id as string;

  const [forum, setForum] = useState<Forum | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });

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
      fetchForum();
    }
  }, [user, userRole, roleLoading, forumId]);

  const fetchForum = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lecturers/forums/${forumId}`);
      if (!response.ok) throw new Error('Failed to fetch forum');
      const data = await response.json();
      setForum(data.forum);
      setPosts(data.posts || []);
    } catch (err: any) {
      console.error('Error fetching forum:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;

    try {
      const response = await fetch(`/api/lecturers/forums/${forumId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      setShowCreatePost(false);
      setNewPost({ title: '', content: '' });
      fetchForum();
    } catch (err: any) {
      console.error('Error creating post:', err);
      alert(err.message);
    }
  };

  const handleVote = async (postId: string, voteType: 'up' | 'down') => {
    try {
      const response = await fetch('/api/lecturers/forums/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, vote_type: voteType }),
      });

      if (response.ok) {
        fetchForum();
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (roleLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !forum) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error || 'Forum not found'}
          </div>
        </div>
      </div>
    );
  }

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/lecturers/forums')}
            className="text-[#0066CC] hover:text-[#0052A3] mb-4 flex items-center gap-2"
          >
            <Icon icon="mdi:arrow-left" />
            Back to Forums
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{forum.title}</h1>
          {forum.description && (
            <p className="text-gray-600 mb-4">{forum.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Created by {forum.created_by_user?.name}</span>
            <span>•</span>
            <span>{forum.view_count} views</span>
          </div>
        </div>

        {/* Create Post Button */}
        {!forum.is_locked && (
          <div className="mb-6">
            <Button
              onClick={() => setShowCreatePost(true)}
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
            >
              <Icon icon="mdi:plus" className="mr-2" />
              New Post
            </Button>
          </div>
        )}

        {/* Posts List */}
        {sortedPosts.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Icon icon="mdi:forum-outline" className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No posts yet</h3>
            <p className="text-gray-500">Be the first to start a discussion!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/lecturers/forums/posts/${post.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {post.is_pinned && (
                        <Icon icon="mdi:pin" className="text-[#0066CC]" />
                      )}
                      <h3 className="text-xl font-semibold text-gray-900">{post.title}</h3>
                      {post.is_locked && (
                        <Icon icon="mdi:lock" className="text-gray-400" />
                      )}
                    </div>
                    <div
                      className="text-gray-600 mb-4 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content.substring(0, 200) + '...') }}
                    />
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:account" />
                        {post.author?.name || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:comment-outline" />
                        {post.reply_count} replies
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:eye-outline" />
                        {post.view_count} views
                      </span>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(post.id, 'up');
                      }}
                      className="text-gray-400 hover:text-[#0066CC] transition-colors"
                    >
                      <Icon icon="mdi:chevron-up" className="text-2xl" />
                    </button>
                    <span className="font-semibold text-gray-700">{post.vote_count}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(post.id, 'down');
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Icon icon="mdi:chevron-down" className="text-2xl" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Post</h2>
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mdi:close" className="text-2xl" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                    placeholder="Enter post title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content *
                  </label>
                  <TextEditor
                    value={newPost.content}
                    onChange={(content) => setNewPost({ ...newPost, content })}
                    placeholder="Write your post content..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowCreatePost(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white"
                  >
                    Create Post
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

