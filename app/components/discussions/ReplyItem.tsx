'use client';

import React from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { sanitizeHtml } from '@/lib/sanitize';

export interface ReplyAuthor {
  id: string;
  name: string;
  email: string;
}

export interface Reply {
  id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  updated_at: string;
  author: ReplyAuthor;
  children: Reply[];
  votes: { count: number }[];
  discussion_id?: string;
  parent_reply_id?: string;
}

export interface ReplyItemProps {
  reply: Reply;
  onReply: (replyId: string) => void;
  onVote: (replyId: string, voteType: 'up' | 'down') => void;
  /** Called after a reply is marked as the accepted solution. */
  onSolution: () => void;
  onDelete: (replyId: string) => void;
  /** Instructors can delete any reply; otherwise only authors can. */
  isInstructor: boolean;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getVoteCount(votes: { count: number }[]) {
  return votes?.[0]?.count || 0;
}

/**
 * Recursive reply card. Renders the author, content (sanitized HTML),
 * vote count, and reply/delete/mark-as-solution actions. Nested replies
 * recurse via `reply.children`.
 */
export default function ReplyItem({
  reply,
  onReply,
  onVote,
  onSolution,
  onDelete,
  isInstructor,
}: ReplyItemProps) {
  const { user } = useSupabase();

  const handleMarkSolution = async () => {
    try {
      const response = await fetch(`/api/discussions/${reply.discussion_id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: reply.content,
          parent_reply_id: reply.parent_reply_id,
          is_solution: true,
        }),
      });
      if (response.ok) onSolution();
    } catch (err) {
      console.error('Error marking as solution:', err);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${
        reply.is_solution ? 'border-oecs-lime-green bg-oecs-light-green/5' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900">{reply.author.name}</span>
            <span className="text-sm text-gray-500">{formatDate(reply.created_at)}</span>
            {reply.is_solution && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-oecs-lime-green text-white">
                ✓ Solution
              </span>
            )}
          </div>

          <div className="prose max-w-none text-gray-700">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(reply.content) }} />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onVote(reply.id, 'up')}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V18m-7-8l3-3m0 0l3 3m-3-3v12"
              />
            </svg>
            {getVoteCount(reply.votes)}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={() => onReply(reply.id)}
          className="text-oecs-lime-green hover:text-oecs-lime-green-dark transition-colors"
        >
          Reply
        </button>
        {user && (user.id === reply.author.id || isInstructor) && (
          <button
            onClick={() => {
              if (confirm('Delete this reply?')) {
                onDelete(reply.id);
              }
            }}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            Delete
          </button>
        )}
        {user && !reply.is_solution && (
          <button
            onClick={handleMarkSolution}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            Mark as Solution
          </button>
        )}
      </div>

      {reply.children && reply.children.length > 0 && (
        <div className="mt-4 ml-6 space-y-3">
          {reply.children.map((childReply) => (
            <ReplyItem
              key={childReply.id}
              reply={childReply}
              onReply={onReply}
              onVote={onVote}
              onSolution={onSolution}
              onDelete={onDelete}
              isInstructor={isInstructor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
