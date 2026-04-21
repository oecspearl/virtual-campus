'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: { id: string; name: string; email: string; role: string } | null;
}

const REGISTRAR_ROLES = new Set(['super_admin', 'tenant_admin', 'admin']);

/**
 * Comment thread for a credit record. Polls on mount and after post.
 * Shared by the student and the registrar surfaces.
 */
export default function CommentThread({ recordId }: { recordId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/credit-records/${recordId}/comments`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load comments');
      setComments(data.comments || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/credit-records/${recordId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to post');
        return;
      }
      setBody('');
      setComments((c) => [...c, data.comment]);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <Icon icon="mdi:forum-outline" className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-900">Notes</h4>
        <span className="text-xs text-gray-500">({comments.length})</span>
      </div>

      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No notes yet. Use this thread to ask for clarification or evidence.
          </p>
        ) : (
          comments.map((c) => {
            const isRegistrar = c.author?.role && REGISTRAR_ROLES.has(c.author.role);
            return (
              <div key={c.id} className="flex gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    isRegistrar ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {(c.author?.name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {c.author?.name || 'Unknown'}
                    </span>
                    {isRegistrar && (
                      <span className="text-[10px] uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-100 px-1.5 rounded">
                        Registrar
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{c.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 bg-white space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={posting || body.trim().length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {posting ? 'Posting…' : <><Icon icon="mdi:send" className="w-3.5 h-3.5" /> Post note</>}
          </button>
        </div>
      </form>
    </div>
  );
}
