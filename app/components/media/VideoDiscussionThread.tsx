'use client';

import React from 'react';

interface Author {
  name: string;
  email?: string;
  role: string;
}

interface Reply {
  id: string;
  body: string;
  author: Author;
  created_at: string;
}

interface Comment {
  id: string;
  video_timestamp: number | null;
  body: string;
  author: Author;
  created_at: string;
  replies: Reply[];
}

interface VideoDiscussionThreadProps {
  lessonId: string;
  courseId?: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_BADGES: Record<string, string> = {
  instructor: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
  super_admin: 'bg-purple-100 text-purple-700',
  curriculum_designer: 'bg-teal-100 text-teal-700',
};

export default function VideoDiscussionThread({ lessonId, courseId, currentTime, onSeek }: VideoDiscussionThreadProps) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newBody, setNewBody] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [replyBody, setReplyBody] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Fetch comments
  React.useEffect(() => {
    fetchComments();
  }, [lessonId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/video-comments?lesson_id=${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Error fetching video comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!newBody.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/video-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          course_id: courseId || null,
          video_timestamp: Math.round(currentTime),
          body: newBody.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => {
          const updated = [...prev, data.comment];
          return updated.sort((a, b) => (a.video_timestamp ?? 0) - (b.video_timestamp ?? 0));
        });
        setNewBody('');
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setPosting(false);
    }
  };

  const postReply = async (parentId: string) => {
    if (!replyBody.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/video-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          course_id: courseId || null,
          parent_id: parentId,
          body: replyBody.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => prev.map(c =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, data.comment] }
            : c
        ));
        setReplyBody('');
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('Error posting reply:', err);
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (id: string, parentId?: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/video-comments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (parentId) {
          setComments(prev => prev.map(c =>
            c.id === parentId
              ? { ...c, replies: c.replies.filter(r => r.id !== id) }
              : c
          ));
        } else {
          setComments(prev => prev.filter(c => c.id !== id));
        }
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Discussion</h3>
          <span className="text-[11px] text-gray-400">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">Comments are timestamped to the video</p>
      </div>

      {/* Comment list */}
      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 px-4">
            <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <p className="text-xs text-gray-400">No comments yet</p>
            <p className="text-[11px] text-gray-400 mt-1">Be the first to comment on this video</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {comments.map(comment => (
              <div key={comment.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                {/* Top-level comment */}
                <div className="flex gap-2.5">
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-gray-500">{getInitials(comment.author.name)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Author + timestamp */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900">{comment.author.name}</span>
                      {ROLE_BADGES[comment.author.role] && (
                        <span className={`text-[9px] font-bold px-1.5 py-px rounded-full ${ROLE_BADGES[comment.author.role]}`}>
                          {comment.author.role === 'instructor' ? 'Instructor' : comment.author.role === 'curriculum_designer' ? 'Designer' : 'Staff'}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{timeAgo(comment.created_at)}</span>
                    </div>

                    {/* Timestamp badge */}
                    {comment.video_timestamp != null && (
                      <button
                        onClick={() => onSeek(comment.video_timestamp!)}
                        className="inline-flex items-center gap-1 mt-1 mb-1 text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                        {formatTs(comment.video_timestamp)}
                      </button>
                    )}

                    {/* Body */}
                    <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{comment.body}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyBody(''); }}
                        className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {comment.replies.length > 0 ? `${comment.replies.length} repl${comment.replies.length === 1 ? 'y' : 'ies'}` : 'Reply'}
                      </button>
                      <button
                        onClick={() => deleteComment(comment.id)}
                        disabled={deletingId === comment.id}
                        className="text-[11px] text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-100">
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="flex gap-2">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[8px] font-bold text-gray-400">{getInitials(reply.author.name)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-gray-800">{reply.author.name}</span>
                                <span className="text-[10px] text-gray-400">{timeAgo(reply.created_at)}</span>
                              </div>
                              <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{reply.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply form */}
                    {replyingTo === comment.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={replyBody}
                          onChange={e => setReplyBody(e.target.value)}
                          onKeyDown={e => handleKeyDown(e, () => postReply(comment.id))}
                          placeholder="Write a reply..."
                          className="flex-1 text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          autoFocus
                        />
                        <button
                          onClick={() => postReply(comment.id)}
                          disabled={posting || !replyBody.trim()}
                          className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-300 transition-colors shrink-0"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose bar */}
      <div className="shrink-0 border-t border-gray-200 p-3 bg-gray-50/50">
        <div className="flex items-center gap-1.5 mb-2">
          <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
          <span className="text-[10px] font-mono text-emerald-600">{formatTs(currentTime)}</span>
          <span className="text-[10px] text-gray-400">— your comment will be linked to this timestamp</span>
        </div>
        <div className="flex gap-2">
          <textarea
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            onKeyDown={e => handleKeyDown(e, postComment)}
            placeholder="Add a comment..."
            rows={2}
            className="flex-1 text-xs border border-gray-200 rounded-md px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400"
          />
          <button
            onClick={postComment}
            disabled={posting || !newBody.trim()}
            className="self-end px-3 py-2 bg-emerald-700 text-white text-xs font-medium rounded-md hover:bg-emerald-800 disabled:bg-gray-300 transition-colors shrink-0"
          >
            {posting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Enter to post · Shift+Enter for new line · Click a timestamp to jump</p>
      </div>
    </div>
  );
}
