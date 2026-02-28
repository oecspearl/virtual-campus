"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { sanitizeHtml } from '@/lib/sanitize';

interface Author {
  id: string;
  name: string;
  email: string;
}

interface Reply {
  id: string;
  content: string;
  author: Author;
  is_solution: boolean;
  vote_count: number;
  created_at: string;
  updated_at: string;
  children: Reply[];
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  author: Author;
  category: { id: string; name: string; slug: string; icon: string; color: string } | null;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  vote_count: number;
  created_at: string;
  updated_at: string;
}

interface GlobalDiscussionDetailProps {
  discussionId: string;
  currentUserId?: string;
}

export default function GlobalDiscussionDetail({
  discussionId,
  currentUserId,
}: GlobalDiscussionDetailProps) {
  const router = useRouter();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isAdmin = userRole && ['admin', 'super_admin'].includes(userRole);

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch('/api/auth/profile');
        if (res.ok) {
          const profile = await res.json();
          setUserRole(profile?.role || 'student');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    if (currentUserId) fetchRole();
  }, [currentUserId]);

  useEffect(() => {
    fetchDiscussion();
  }, [discussionId]);

  const fetchDiscussion = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/discussions/global/${discussionId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load discussion");
        return;
      }

      setDiscussion(data.discussion);
      setReplies(data.replies || []);
    } catch (err) {
      setError("Failed to load discussion");
      console.error("Error fetching discussion:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (voteType: "up" | "down", replyId?: string) => {
    try {
      const response = await fetch("/api/discussions/global/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discussion_id: replyId ? null : discussionId,
          reply_id: replyId || null,
          vote_type: voteType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (!replyId) {
          setDiscussion((prev) =>
            prev ? { ...prev, vote_count: data.vote_count } : prev
          );
          setUserVote(data.action === "removed" ? null : data.vote_type);
        } else {
          // Update reply vote count in the tree
          setReplies((prev) => updateReplyVoteCount(prev, replyId, data.vote_count));
        }
      }
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  const updateReplyVoteCount = (
    replies: Reply[],
    replyId: string,
    newVoteCount: number
  ): Reply[] => {
    return replies.map((reply) => {
      if (reply.id === replyId) {
        return { ...reply, vote_count: newVoteCount };
      }
      if (reply.children.length > 0) {
        return {
          ...reply,
          children: updateReplyVoteCount(reply.children, replyId, newVoteCount),
        };
      }
      return reply;
    });
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/discussions/global/${discussionId}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: replyContent.trim(),
            parent_reply_id: replyingTo,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to post reply");
        return;
      }

      setReplyContent("");
      setReplyingTo(null);
      fetchDiscussion(); // Refresh to get new reply
    } catch (err) {
      setError("Failed to post reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!confirm('Delete this discussion? All replies will also be deleted.')) return;
    try {
      const res = await fetch(`/api/discussions/global/${discussionId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/discussions');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete discussion');
      }
    } catch (err) {
      console.error('Error deleting discussion:', err);
      setError('Failed to delete discussion');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const res = await fetch(`/api/discussions/global/replies/${replyId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDiscussion();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete reply');
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      setError('Failed to delete reply');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="text-center py-12">
        <Icon icon="mdi:alert-circle" className="w-16 h-16 mx-auto text-red-400 mb-4" />
        <p className="text-gray-600">{error || "Discussion not found"}</p>
        <button
          onClick={() => router.push("/discussions")}
          className="mt-4 text-[#0066CC] hover:underline"
        >
          Back to discussions
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/discussions")}
        className="flex items-center gap-2 text-gray-600 hover:text-[#0066CC]"
      >
        <Icon icon="mdi:arrow-left" className="w-5 h-5" />
        Back to discussions
      </button>

      {/* Discussion Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {discussion.is_pinned && (
            <span className="flex items-center gap-1 px-2 py-1 bg-[#B5D334]/20 text-[#8fb02a] rounded-full text-xs font-medium">
              <Icon icon="mdi:pin" className="w-3 h-3" />
              Pinned
            </span>
          )}
          {discussion.is_locked && (
            <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              <Icon icon="mdi:lock" className="w-3 h-3" />
              Locked
            </span>
          )}
          {discussion.category && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {discussion.category.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{discussion.title}</h1>

        {/* Author Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0066CC] rounded-full flex items-center justify-center text-white font-medium">
              {discussion.author?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <span className="font-medium text-gray-700">
              {discussion.author?.name || "Unknown"}
            </span>
          </div>
          <span>•</span>
          <span>{formatDate(discussion.created_at)}</span>
          <span>•</span>
          <span>{discussion.view_count} views</span>
        </div>

        {/* Content */}
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(discussion.content) }}
        />

        {/* Delete Button */}
        {currentUserId && (currentUserId === discussion.author?.id || isAdmin) && (
          <div className="mt-4">
            <button
              onClick={handleDeleteDiscussion}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Icon icon="mdi:delete-outline" className="w-4 h-4" />
              Delete Discussion
            </button>
          </div>
        )}

        {/* Vote and Stats */}
        <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote("up")}
              className={`p-1 rounded hover:bg-gray-100 ${
                userVote === "up" ? "text-green-600" : "text-gray-400"
              }`}
            >
              <Icon icon="mdi:arrow-up-bold" className="w-6 h-6" />
            </button>
            <span className="font-medium text-gray-700">{discussion.vote_count}</span>
            <button
              onClick={() => handleVote("down")}
              className={`p-1 rounded hover:bg-gray-100 ${
                userVote === "down" ? "text-red-600" : "text-gray-400"
              }`}
            >
              <Icon icon="mdi:arrow-down-bold" className="w-6 h-6" />
            </button>
          </div>
          <span className="text-gray-500 flex items-center gap-1">
            <Icon icon="mdi:comment-outline" className="w-5 h-5" />
            {discussion.reply_count} replies
          </span>
        </div>
      </div>

      {/* Reply Form */}
      {!discussion.is_locked && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {replyingTo ? "Reply to comment" : "Add a reply"}
          </h3>
          {replyingTo && (
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
              <span>Replying to a comment</span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-red-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          <form onSubmit={handleSubmitReply}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent resize-none"
              required
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={isSubmitting || !replyContent.trim()}
                className="px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && (
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                )}
                Post Reply
              </button>
            </div>
          </form>
        </div>
      )}

      {discussion.is_locked && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500">
          <Icon icon="mdi:lock" className="w-8 h-8 mx-auto mb-2" />
          <p>This discussion is locked. No new replies can be added.</p>
        </div>
      )}

      {/* Replies */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">
          {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
        </h3>
        {replies.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No replies yet. Be the first to respond!
          </p>
        ) : (
          <AnimatePresence>
            {replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                onReply={(replyId) => setReplyingTo(replyId)}
                onVote={handleVote}
                onDelete={handleDeleteReply}
                currentUserId={currentUserId}
                isLocked={discussion.is_locked}
                isAdmin={!!isAdmin}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Reply Item Component
function ReplyItem({
  reply,
  onReply,
  onVote,
  onDelete,
  currentUserId,
  isLocked,
  isAdmin,
  depth = 0,
}: {
  reply: Reply;
  onReply: (replyId: string) => void;
  onVote: (voteType: "up" | "down", replyId: string) => void;
  onDelete: (replyId: string) => void;
  currentUserId?: string;
  isLocked: boolean;
  isAdmin: boolean;
  depth?: number;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? "ml-6 sm:ml-8 border-l-2 border-gray-100 pl-4" : ""}`}
    >
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Solution Badge */}
        {reply.is_solution && (
          <div className="flex items-center gap-1 mb-2 text-green-600 text-sm font-medium">
            <Icon icon="mdi:check-circle" className="w-4 h-4" />
            Accepted Solution
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <div className="w-6 h-6 bg-[#0066CC] rounded-full flex items-center justify-center text-white text-xs font-medium">
            {reply.author?.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <span className="font-medium text-gray-700">
            {reply.author?.name || "Unknown"}
          </span>
          <span>•</span>
          <span>{formatDate(reply.created_at)}</span>
        </div>

        {/* Content */}
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(reply.content) }}
        />

        {/* Actions */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onVote("up", reply.id)}
              className="p-1 text-gray-400 hover:text-green-600 rounded"
            >
              <Icon icon="mdi:arrow-up" className="w-4 h-4" />
            </button>
            <span className="text-gray-600">{reply.vote_count}</span>
            <button
              onClick={() => onVote("down", reply.id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
            >
              <Icon icon="mdi:arrow-down" className="w-4 h-4" />
            </button>
          </div>
          {!isLocked && depth < 3 && (
            <button
              onClick={() => onReply(reply.id)}
              className="text-gray-500 hover:text-[#0066CC] flex items-center gap-1"
            >
              <Icon icon="mdi:reply" className="w-4 h-4" />
              Reply
            </button>
          )}
          {currentUserId && (currentUserId === reply.author?.id || isAdmin) && (
            <button
              onClick={() => {
                if (confirm('Delete this reply?')) {
                  onDelete(reply.id);
                }
              }}
              className="text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <Icon icon="mdi:delete-outline" className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {reply.children && reply.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {reply.children.map((childReply) => (
            <ReplyItem
              key={childReply.id}
              reply={childReply}
              onReply={onReply}
              onVote={onVote}
              onDelete={onDelete}
              currentUserId={currentUserId}
              isLocked={isLocked}
              isAdmin={isAdmin}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
