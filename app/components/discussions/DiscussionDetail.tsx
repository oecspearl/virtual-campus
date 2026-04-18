'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import { useSupabase } from '@/lib/supabase-provider';
import DiscussionGrader from './DiscussionGrader';
import ReplyForm from './ReplyForm';
import ReplyItem from './ReplyItem';
import DiscussionEditForm from './DiscussionEditForm';
import DiscussionHeader from './DiscussionHeader';
import { useDiscussionData } from './hooks/useDiscussionData';
import { useUserRole } from './hooks/useUserRole';

interface DiscussionDetailProps {
  courseId: string;
  discussionId: string;
}

export default function DiscussionDetail({ courseId, discussionId }: DiscussionDetailProps) {
  const { user } = useSupabase();
  const {
    discussion,
    replies,
    loading,
    error,
    refetch: fetchDiscussion,
    voteDiscussion: handleVote,
    voteReply: handleReplyVote,
    deleteReply: handleDeleteReply,
  } = useDiscussionData(discussionId);
  const { isInstructor } = useUserRole();

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showGrader, setShowGrader] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading discussion: {error}</p>
        <Button onClick={fetchDiscussion} variant="outline" className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href={`/course/${courseId}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Course
      </Link>

      <DiscussionHeader
        discussion={discussion}
        discussionId={discussionId}
        courseId={courseId}
        isInstructor={isInstructor}
        canModify={!!user && (user.id === discussion.author.id || isInstructor)}
        isEditing={isEditing}
        onStartEdit={() => setIsEditing(true)}
        onVote={() => handleVote(discussion.id, 'up')}
        onOpenGrader={() => setShowGrader(true)}
      />

      {/* Edit Form */}
      {isEditing && discussion && (
        <DiscussionEditForm
          discussion={discussion}
          discussionId={discussionId}
          isInstructor={isInstructor}
          onSaved={() => {
            setIsEditing(false);
            fetchDiscussion();
          }}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {/* Replies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Replies ({replies.length})
          </h2>
          {user && !discussion.is_locked && (
            <Button onClick={() => setShowReplyForm(true)}>
              Reply
            </Button>
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
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
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
          ))}
        </div>

        {replies.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No replies yet. Be the first to respond!
          </div>
        )}
      </div>

      {/* Discussion Grader Modal */}
      {showGrader && discussion && (
        <DiscussionGrader
          discussionId={discussionId}
          courseId={courseId}
          onClose={() => setShowGrader(false)}
        />
      )}
    </div>
  );
}
