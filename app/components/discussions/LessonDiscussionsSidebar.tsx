'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Discussion {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    name: string;
  };
  replies: { count: number }[];
  votes: { count: number }[];
}

interface LessonDiscussionsSidebarProps {
  courseId: string;
  lessonId: string;
}

export default function LessonDiscussionsSidebar({ courseId, lessonId }: LessonDiscussionsSidebarProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setDiscussions(data.discussions?.slice(0, 3) || []); // Show only first 3 discussions
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

  const getReplyCount = (replies: { count: number }[]) => {
    return replies?.[0]?.count || 0;
  };

  const getVoteCount = (votes: { count: number }[]) => {
    return votes?.[0]?.count || 0;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Discussions
        </h3>
        <Link
          href={`/course/${courseId}/lesson/${lessonId}/discussions`}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          View All
        </Link>
      </div>
      <div className="p-4">

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 mb-4">
          Failed to load discussions
        </div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 mb-3">No discussions yet</p>
          <Link
            href={`/course/${courseId}/lesson/${lessonId}/discussions`}
            className="inline-flex items-center px-3 py-1.5 text-xs text-slate-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Start Discussion
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((discussion) => (
            <Link
              key={discussion.id}
              href={`/course/${courseId}/lesson/${lessonId}/discussions/${discussion.id}`}
              className="block px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group"
            >
              <h4 className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors mb-1 line-clamp-2">
                {discussion.title}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-1 mb-1.5">
                {discussion.content.replace(/<[^>]*>/g, '')} {/* Strip HTML tags */}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>by {discussion.author.name}</span>
                <div className="flex items-center gap-3">
                  <span>{formatDate(discussion.created_at)}</span>
                  {getReplyCount(discussion.replies) > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {getReplyCount(discussion.replies)}
                    </span>
                  )}
                  {getVoteCount(discussion.votes) > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V18m-7-8l3-3m0 0l3 3m-3-3v12" />
                      </svg>
                      {getVoteCount(discussion.votes)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
          
          {discussions.length >= 3 && (
            <div className="pt-2 border-t border-gray-100">
              <Link
                href={`/course/${courseId}/lesson/${lessonId}/discussions`}
                className="block w-full text-center px-3 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                View All Discussions
              </Link>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
