'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import { useSupabase } from '@/lib/supabase-provider';
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
  created_at: string;
  updated_at: string;
  author: Author;
  children: Reply[];
  votes: { count: number }[];
  discussion_id?: string;
  parent_reply_id?: string;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author: Author;
  votes: { count: number }[];
}

interface LessonDiscussionDetailProps {
  courseId: string;
  lessonId: string;
  discussionId: string;
}

export default function LessonDiscussionDetail({ courseId, lessonId, discussionId }: LessonDiscussionDetailProps) {
  const { user, supabase } = useSupabase();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isInstructor = userRole && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userRole);

  // Fetch user role
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
        } catch (err) {
          console.error('Error fetching profile:', err);
          setUserRole(user.user_metadata?.role || 'student');
        }
      }
    };
    fetchUserProfile();
  }, [user, supabase]);

  useEffect(() => {
    fetchDiscussion();
  }, [discussionId]);

  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lesson-discussions/${discussionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch discussion');
      }
      const data = await response.json();
      setDiscussion(data.discussion);
      setReplies(data.replies || []);
    } catch (err: any) {
      console.error('Error fetching lesson discussion:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVoteCount = (votes: { count: number }[]) => {
    return votes?.[0]?.count || 0;
  };

  const handleVote = async (discussionId: string, voteType: 'up' | 'down') => {
    try {
      const response = await fetch('/api/lesson-discussions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discussion_id: discussionId,
          vote_type: voteType
        })
      });

      if (response.ok) {
        fetchDiscussion(); // Refresh to get updated vote counts
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleReplyVote = async (replyId: string, voteType: 'up' | 'down') => {
    try {
      const response = await fetch('/api/lesson-discussions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_id: replyId,
          vote_type: voteType
        })
      });

      if (response.ok) {
        fetchDiscussion(); // Refresh to get updated vote counts
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleEdit = () => {
    if (discussion) {
      setEditTitle(discussion.title);
      setEditContent(discussion.content);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert('Title and content are required');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Saving lesson discussion edit:', { lessonId, discussionId, title: editTitle, content: editContent });
      
      const apiUrl = `${window.location.origin}/api/lessons/${lessonId}/discussions/${discussionId}`;
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim()
        })
      });

      console.log('Save response status:', response.status);
      console.log('Save response ok:', response.ok);

      if (response.ok) {
        console.log('Lesson discussion updated successfully');
        setIsEditing(false);
        fetchDiscussion(); // Refresh to get updated content
        alert('Discussion updated successfully!');
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        alert(`Failed to update discussion: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating lesson discussion:', err);
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      alert(`Failed to update discussion: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!confirm('Delete this discussion? All replies will also be deleted.')) return;
    try {
      const res = await fetch(`/api/lesson-discussions/${discussionId}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = `/course/${courseId}/lesson/${lessonId}`;
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete discussion');
      }
    } catch (err) {
      console.error('Error deleting discussion:', err);
      alert('Failed to delete discussion');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const res = await fetch(`/api/lesson-discussions/${discussionId}/replies/${replyId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDiscussion();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete reply');
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      alert('Failed to delete reply');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Error Loading Discussion</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
        <Button onClick={fetchDiscussion} variant="outline" className="bg-white hover:bg-red-50">
          <Icon icon="material-symbols:refresh" className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-sm text-gray-600"
      >
        <Link 
          href={`/course/${courseId}`}
          className="hover:text-blue-600 transition-colors"
        >
          Course
        </Link>
        <Icon icon="material-symbols:chevron-right" className="w-4 h-4" />
        <Link 
          href={`/course/${courseId}/lesson/${lessonId}`}
          className="hover:text-blue-600 transition-colors"
        >
          Lesson
        </Link>
        <Icon icon="material-symbols:chevron-right" className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Discussion</span>
      </motion.div>

      {/* Discussion Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 shadow-lg"
      >
        <div className="flex items-start gap-4">
          {/* Author Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {discussion.author.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Status Badges */}
            <div className="flex items-center gap-2 mb-3">
              {discussion.is_pinned && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  <Icon icon="material-symbols:push-pin" className="w-3 h-3" />
                  Pinned
                </span>
              )}
              {discussion.is_locked && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  <Icon icon="material-symbols:lock" className="w-3 h-3" />
                  Locked
                </span>
              )}
            </div>
            
            <h1 className="text-lg sm:text-xl font-normal text-slate-900 tracking-tight mb-4 leading-tight">
              {discussion.title}
            </h1>
            
            <div className="prose prose-lg max-w-none mb-6 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900">
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(discussion.content) }} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Icon icon="material-symbols:person" className="w-4 h-4" />
                  <span className="font-medium">{discussion.author.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="material-symbols:schedule" className="w-4 h-4" />
                  <span>{formatDate(discussion.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {user && (user.id === discussion.author.id || isInstructor) && !isEditing && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Icon icon="material-symbols:edit" className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteDiscussion}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Icon icon="mdi:delete-outline" className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleVote(discussion.id, 'up')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors group"
                >
                  <Icon icon="material-symbols:thumb-up" className="w-4 h-4 group-hover:text-blue-600" />
                  <span className="font-medium">{getVoteCount(discussion.votes)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Icon icon="material-symbols:edit" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Edit Discussion</h3>
              <p className="text-gray-600 text-sm">Update your discussion content</p>
            </div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Discussion Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                placeholder="Discussion title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Discussion Content
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <TextEditor
                  value={editContent}
                  onChange={setEditContent}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon icon="material-symbols:save" className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancelEdit} 
                disabled={isSaving}
                className="px-4 py-2 rounded-md border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Replies Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Icon icon="material-symbols:reply" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Replies ({replies.length})
              </h2>
              <p className="text-gray-600 text-sm">Join the conversation</p>
            </div>
          </div>
          {user && !discussion.is_locked && (
            <motion.button
              onClick={() => setShowReplyForm(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
            >
              <Icon icon="material-symbols:add" className="w-5 h-5" />
              Reply
            </motion.button>
          )}
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <ReplyForm
            discussionId={discussionId}
            parentReplyId={replyingTo}
            onSuccess={() => {
              setShowReplyForm(false);
              setReplyingTo(null);
              fetchDiscussion();
            }}
            onCancel={() => {
              setShowReplyForm(false);
              setReplyingTo(null);
            }}
          />
        )}

        {/* Replies List */}
        <div className="space-y-4">
          {replies.map((reply, index) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ReplyItem
                reply={reply}
                onReply={(replyId) => {
                  setReplyingTo(replyId);
                  setShowReplyForm(true);
                }}
                onVote={handleReplyVote}
                onSolution={() => fetchDiscussion()}
                onDelete={handleDeleteReply}
                isInstructor={!!isInstructor}
              />
            </motion.div>
          ))}
        </div>

        {replies.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Icon icon="material-symbols:forum" className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No replies yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Be the first to share your thoughts and start a meaningful conversation about this topic!
            </p>
            {user && !discussion.is_locked && (
              <motion.button
                onClick={() => setShowReplyForm(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <Icon icon="material-symbols:add" className="w-5 h-5" />
                Start the Conversation
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Reply Item Component
interface ReplyItemProps {
  reply: Reply;
  onReply: (replyId: string) => void;
  onVote: (replyId: string, voteType: 'up' | 'down') => void;
  onSolution: () => void;
  /** Recursion depth — used to cap visible indentation on narrow viewports. */
  depth?: number;
}

function ReplyItem({ reply, onReply, onVote, onSolution, onDelete, isInstructor, depth = 0 }: ReplyItemProps & { onDelete: (replyId: string) => void; isInstructor: boolean }) {
  const { user } = useSupabase();
  const [showReplyForm, setShowReplyForm] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVoteCount = (votes: { count: number }[]) => {
    return votes?.[0]?.count || 0;
  };

  return (
    <div className={`group bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${
      reply.is_solution ? 'border-green-300 bg-green-50/50 shadow-md' : ''
    }`}>
      <div className="flex items-start gap-4">
        {/* Author Avatar */}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {reply.author.name.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Author Info and Status — wrap on narrow viewports rather than overflow */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 min-w-0">
            <span className="font-semibold text-gray-900 truncate max-w-full">{reply.author.name}</span>
            <span className="text-sm text-gray-500">{formatDate(reply.created_at)}</span>
            {reply.is_solution && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                <Icon icon="material-symbols:check-circle" className="w-3 h-3" />
                Solution
              </span>
            )}
          </div>

          {/* Reply Content */}
          <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 mb-4 break-words">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(reply.content) }} />
          </div>

          {/* Actions — wrap freely; vote sits to the right via ml-auto */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => onReply(reply.id)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Icon icon="material-symbols:reply" className="w-4 h-4" />
              Reply
            </button>
            {user && (user.id === reply.author.id || isInstructor) && (
              <button
                onClick={() => {
                  if (confirm('Delete this reply?')) {
                    onDelete(reply.id);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Icon icon="mdi:delete-outline" className="w-4 h-4" />
                Delete
              </button>
            )}
            {user && !reply.is_solution && (
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/lesson-discussions/${reply.discussion_id}/replies`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        content: reply.content,
                        parent_reply_id: reply.parent_reply_id,
                        is_solution: true
                      })
                    });
                    if (response.ok) onSolution();
                  } catch (err) {
                    console.error('Error marking as solution:', err);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Icon icon="material-symbols:check-circle" className="w-4 h-4" />
                <span className="hidden sm:inline">Mark as Solution</span>
                <span className="sm:hidden">Solution</span>
              </button>
            )}

            <button
              onClick={() => onVote(reply.id, 'up')}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 ml-auto rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors group"
              aria-label="Upvote"
            >
              <Icon icon="material-symbols:thumb-up" className="w-4 h-4 group-hover:text-blue-600" />
              <span className="font-medium text-sm">{getVoteCount(reply.votes)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nested Replies — indentation caps at depth 3 so deep threads don't
          squeeze content off the right edge on a 375px viewport. */}
      {reply.children && reply.children.length > 0 && (() => {
        const nextDepth = depth + 1;
        const cappedMl = nextDepth >= 4 ? '' : 'ml-3 sm:ml-8';
        const cappedPl = 'pl-3 sm:pl-6';
        return (
          <div className={`mt-6 ${cappedMl} space-y-4 border-l-2 border-gray-100 ${cappedPl}`}>
            {reply.children.map((childReply) => (
              <ReplyItem
                key={childReply.id}
                reply={childReply}
                onReply={onReply}
                onVote={onVote}
                onSolution={onSolution}
                onDelete={onDelete}
                isInstructor={isInstructor}
                depth={nextDepth}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// Reply Form Component
interface ReplyFormProps {
  discussionId: string;
  parentReplyId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function ReplyForm({ discussionId, parentReplyId, onSuccess, onCancel }: ReplyFormProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/lesson-discussions/${discussionId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          parent_reply_id: parentReplyId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create reply');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating reply:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
          <Icon icon="material-symbols:reply" className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {parentReplyId ? 'Reply to Comment' : 'Add Reply'}
          </h3>
          <p className="text-gray-600 text-sm">Share your thoughts and contribute to the discussion</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Your Reply
          </label>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <TextEditor
              value={content}
              onChange={setContent}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center gap-2">
              <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-4">
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Icon icon="material-symbols:send" className="w-4 h-4 mr-2" />
                Post Reply
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="px-4 py-2 rounded-md border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
