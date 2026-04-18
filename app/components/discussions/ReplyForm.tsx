'use client';

import React, { useState } from 'react';
import Button from '@/app/components/ui/Button';
import TextEditor from '@/app/components/editor/TextEditor';

export interface ReplyFormProps {
  discussionId: string;
  /** If set, the reply is posted as a child of this reply. */
  parentReplyId?: string | null;
  /** Called after a successful POST so the parent can refetch. */
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Small form for adding a top-level reply or nested reply to a discussion.
 * POSTs to `/api/discussions/:id/replies` and bubbles success/cancel up to
 * the parent so the list can refetch.
 */
export default function ReplyForm({
  discussionId,
  parentReplyId,
  onSuccess,
  onCancel,
}: ReplyFormProps) {
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
      const response = await fetch(`/api/discussions/${discussionId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          parent_reply_id: parentReplyId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create reply');
      }

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create reply';
      console.error('Error creating reply:', err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {parentReplyId ? 'Reply to Comment' : 'Add Reply'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <TextEditor value={content} onChange={setContent} />
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Posting...' : 'Post Reply'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
