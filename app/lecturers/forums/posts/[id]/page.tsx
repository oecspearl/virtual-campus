'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import { hasRole } from '@/lib/rbac';
import Button from '@/app/components/ui/Button';
import TextEditor from '@/app/components/editor/TextEditor';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { sanitizeHtml } from '@/lib/sanitize';

interface Author {
  id: string;
  name: string;
  email: string;
}

interface Reply {
  id: string;
  content: string;
  is_solution: boolean;
  vote_count: number;
  created_at: string;
  updated_at: string;
  author: Author;
  nested_replies: Reply[];
}

interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author: Author;
  forum: {
    id: string;
    title: string;
    category: string;
  };
  is_pinned: boolean;
  is_locked: boolean;
  vote_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, supabase } = useSupabase();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

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
      fetchPost();
    }
  }, [user, userRole, roleLoading, postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lecturers/forums/posts/${postId}`);
      if (!response.ok) throw new Error('Failed to fetch post');
      const data = await response.json();
      setPost(data.post);
      setReplies(data.replies || []);
    } catch (err: any) {
      console.error('Error fetching post:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      const response = await fetch(`/api/lecturers/forums/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          parent_reply_id: replyingTo || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create reply');
      }

      setShowReplyForm(false);
      setReplyingTo(null);
      setReplyContent('');
      fetchPost();
    } catch (err: any) {
      console.error('Error creating reply:', err);
      alert(err.message);
    }
  };

  const handleVote = async (postId: string | null, replyId: string | null, voteType: 'up' | 'down') => {
    try {
      const response = await fetch('/api/lecturers/forums/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          reply_id: replyId,
          vote_type: voteType,
        }),
      });

      if (response.ok) {
        fetchPost();
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleMarkSolution = async (replyId: string) => {
    try {
      const response = await fetch(`/api/lecturers/forums/posts/replies/${replyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_solution: true }),
      });

      if (response.ok) {
        fetchPost();
      }
    } catch (err) {
      console.error('Error marking solution:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReply = (reply: Reply, depth = 0) => (
    <div key={reply.id} className={depth > 0 ? 'ml-8 mt-4 border-l-2 border-gray-200 pl-4' : ''}>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{reply.author?.name || 'Unknown'}</span>
            {reply.is_solution && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                Solution
              </span>
            )}
            <span className="text-sm text-gray-500">{formatDate(reply.created_at)}</span>
          </div>
          {post && post.author_id === user?.id && !reply.is_solution && (
            <button
              onClick={() => handleMarkSolution(reply.id)}
              className="text-sm text-green-600 hover:text-green-700"
            >
              Mark as Solution
            </button>
          )}
        </div>
        <div
          className="text-gray-700 mb-3 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(reply.content) }}
        />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote(null, reply.id, 'up')}
              className="text-gray-400 hover:text-[#0066CC] transition-colors"
            >
              <Icon icon="mdi:chevron-up" />
            </button>
            <span className="text-sm font-medium text-gray-700">{reply.vote_count}</span>
            <button
              onClick={() => handleVote(null, reply.id, 'down')}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Icon icon="mdi:chevron-down" />
            </button>
          </div>
          {!post?.is_locked && (
            <button
              onClick={() => {
                setReplyingTo(reply.id);
                setShowReplyForm(true);
              }}
              className="text-sm text-[#0066CC] hover:text-[#0052A3]"
            >
              Reply
            </button>
          )}
        </div>
      </div>
      {reply.nested_replies && reply.nested_replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {reply.nested_replies.map((nested) => renderReply(nested, depth + 1))}
        </div>
      )}
    </div>
  );

  if (roleLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
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
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 text-red-700">
            {error || 'Post not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/lecturers/forums/${post.forum.id}`)}
            className="text-[#0066CC] hover:text-[#0052A3] mb-4 flex items-center gap-2"
          >
            <Icon icon="mdi:arrow-left" />
            Back to {post.forum.title}
          </button>
          <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-4">{post.title}</h1>
        </div>

        {/* Post */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0066CC] rounded-full flex items-center justify-center text-white font-semibold">
                {post.author?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{post.author?.name || 'Unknown'}</div>
                <div className="text-sm text-gray-500">{formatDate(post.created_at)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVote(post.id, null, 'up')}
                className="text-gray-400 hover:text-[#0066CC] transition-colors"
              >
                <Icon icon="mdi:chevron-up" className="text-2xl" />
              </button>
              <span className="font-semibold text-gray-700 min-w-[2rem] text-center">
                {post.vote_count}
              </span>
              <button
                onClick={() => handleVote(post.id, null, 'down')}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Icon icon="mdi:chevron-down" className="text-2xl" />
              </button>
            </div>
          </div>
          <div
            className="text-gray-700 prose prose-lg max-w-none mb-4"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
          />
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Icon icon="mdi:eye-outline" />
              {post.view_count} views
            </span>
            <span className="flex items-center gap-1">
              <Icon icon="mdi:comment-outline" />
              {replies.length} replies
            </span>
          </div>
        </div>

        {/* Replies */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </h2>
          {replies.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
              <Icon icon="mdi:comment-outline" className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No replies yet. Be the first to reply!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => renderReply(reply))}
            </div>
          )}
        </div>

        {/* Reply Form */}
        {!post.is_locked && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            {!showReplyForm ? (
              <Button
                onClick={() => setShowReplyForm(true)}
                className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white"
              >
                <Icon icon="mdi:reply" className="mr-2" />
                Add Reply
              </Button>
            ) : (
              <form onSubmit={handleReply} className="space-y-4">
                {replyingTo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    Replying to a comment...
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(null);
                        setShowReplyForm(false);
                      }}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <TextEditor
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder="Write your reply..."
                />
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white"
                  >
                    Post Reply
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

