'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from './Button';
import { useSupabase } from '@/lib/supabase-provider';
import TextEditor from './TextEditor';

interface Discussion {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  replies: { count: number }[];
  votes: { count: number }[];
}

interface LessonDiscussionListProps {
  lessonId: string;
  courseId: string;
}

export default function LessonDiscussionList({ lessonId, courseId }: LessonDiscussionListProps) {
  const { user } = useSupabase();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [lessonId]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lessons/${lessonId}/discussions`);
      if (!response.ok) {
        throw new Error('Failed to fetch discussions');
      }
      const data = await response.json();
      setDiscussions(data.discussions || []);
    } catch (err: any) {
      console.error('Error fetching lesson discussions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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

  const getVoteCount = (votes: { count: number }[]) => {
    return votes?.[0]?.count || 0;
  };

  const getReplyCount = (replies: { count: number }[]) => {
    return replies?.[0]?.count || 0;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading discussions: {error}</p>
        <Button onClick={fetchDiscussions} variant="outline" className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Lesson Discussions</h2>
        {user && (
          <Button onClick={() => setShowCreateForm(true)}>
            Start Discussion
          </Button>
        )}
      </div>

      {/* Create Discussion Form */}
      {showCreateForm && (
        <CreateLessonDiscussionForm 
          lessonId={lessonId} 
          courseId={courseId}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchDiscussions();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Discussions List */}
      {discussions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions yet</h3>
          <p className="text-gray-500 mb-4">Be the first to start a discussion about this lesson!</p>
          {user && (
            <Button onClick={() => setShowCreateForm(true)}>
              Start First Discussion
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <div
              key={discussion.id}
              className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${
                discussion.is_pinned ? 'border-oecs-lime-green bg-oecs-light-green/5' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.is_pinned && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-oecs-lime-green text-white">
                        📌 Pinned
                      </span>
                    )}
                    {discussion.is_locked && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        🔒 Locked
                      </span>
                    )}
                  </div>
                  
                  <Link 
                    href={`/course/${courseId}/lesson/${lessonId}/discussions/${discussion.id}`}
                    className="block group"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-oecs-lime-green transition-colors mb-2">
                      {discussion.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-2 mb-3">
                      {discussion.content}
                    </p>
                  </Link>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>by {discussion.author.name}</span>
                    <span>•</span>
                    <span>{formatDate(discussion.created_at)}</span>
                    <span>•</span>
                    <span>{getReplyCount(discussion.replies)} replies</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V18m-7-8l3-3m0 0l3 3m-3-3v12" />
                      </svg>
                      {getVoteCount(discussion.votes)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Create Lesson Discussion Form Component
interface CreateLessonDiscussionFormProps {
  lessonId: string;
  courseId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateLessonDiscussionForm({ lessonId, courseId, onSuccess, onCancel }: CreateLessonDiscussionFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${lessonId}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          is_pinned: isPinned,
          is_locked: isLocked
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create discussion');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating lesson discussion:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Discussion</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green"
            placeholder="What's your question about this lesson?"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <TextEditor
            value={content}
            onChange={setContent}
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Pin this discussion</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Lock this discussion</span>
          </label>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Discussion'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
