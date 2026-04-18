'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Reply } from '../ReplyItem';

export interface DiscussionAuthor {
  id: string;
  name: string;
  email: string;
}

export interface Discussion {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author: DiscussionAuthor;
  votes: { count: number }[];
  is_graded?: boolean;
  points?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rubric?: any;
  due_date?: string;
  grading_criteria?: string;
  min_replies?: number;
  min_words?: number;
}

export interface UseDiscussionDataResult {
  discussion: Discussion | null;
  replies: Reply[];
  loading: boolean;
  error: string | null;
  /** Re-fetch the discussion + replies. Safe to call from vote/delete handlers. */
  refetch: () => Promise<void>;
  /** Upvote/downvote the top-level discussion, then refetch to pick up counts. */
  voteDiscussion: (discussionId: string, voteType: 'up' | 'down') => Promise<void>;
  /** Upvote/downvote a reply, then refetch. */
  voteReply: (replyId: string, voteType: 'up' | 'down') => Promise<void>;
  /** Delete a reply and refetch on success; alerts on server-side failure. */
  deleteReply: (replyId: string) => Promise<void>;
}

/**
 * Owns the discussion + replies network state for the DiscussionDetail
 * view. Fetches once per discussionId change and exposes action callbacks
 * that perform their mutation and refetch so the UI stays in sync without
 * the caller wiring up refetch-after-action plumbing.
 *
 * Errors from the initial GET are exposed via `error`; errors from vote
 * and delete calls are logged/alerted — they don't poison the whole view.
 */
export function useDiscussionData(discussionId: string): UseDiscussionDataResult {
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/discussions/${discussionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch discussion');
      }
      const data = await response.json();
      setDiscussion(data.discussion);
      setReplies(data.replies || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch discussion';
      console.error('Error fetching discussion:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [discussionId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const voteDiscussion = useCallback(
    async (id: string, voteType: 'up' | 'down') => {
      try {
        const response = await fetch('/api/discussions/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discussion_id: id, vote_type: voteType }),
        });
        if (response.ok) {
          await refetch();
        }
      } catch (err) {
        console.error('Error voting:', err);
      }
    },
    [refetch]
  );

  const voteReply = useCallback(
    async (replyId: string, voteType: 'up' | 'down') => {
      try {
        const response = await fetch('/api/discussions/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply_id: replyId, vote_type: voteType }),
        });
        if (response.ok) {
          await refetch();
        }
      } catch (err) {
        console.error('Error voting:', err);
      }
    },
    [refetch]
  );

  const deleteReply = useCallback(
    async (replyId: string) => {
      try {
        const res = await fetch(
          `/api/discussions/${discussionId}/replies/${replyId}`,
          { method: 'DELETE' }
        );
        if (res.ok) {
          await refetch();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to delete reply');
        }
      } catch (err) {
        console.error('Error deleting reply:', err);
        alert('Failed to delete reply');
      }
    },
    [discussionId, refetch]
  );

  return { discussion, replies, loading, error, refetch, voteDiscussion, voteReply, deleteReply };
}
