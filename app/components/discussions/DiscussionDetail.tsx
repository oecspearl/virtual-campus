'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import DiscussionGrader from './DiscussionGrader';
import { sanitizeHtml } from '@/lib/sanitize';
import ReplyForm from './ReplyForm';
import ReplyItem from './ReplyItem';
import DiscussionEditForm from './DiscussionEditForm';
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
  const [showGradingInfo, setShowGradingInfo] = useState(false);

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

      {/* Discussion Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {discussion.is_graded && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <Icon icon="material-symbols:grade" className="w-3 h-3" />
                  Graded - {discussion.points} pts
                </span>
              )}
              {discussion.is_graded && discussion.due_date && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                  <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                  Due: {new Date(discussion.due_date).toLocaleDateString()}
                </span>
              )}
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

            {/* Grading Info Button for Students */}
            {discussion.is_graded && !isInstructor && (
              <div className="mb-4">
                <button
                  onClick={() => setShowGradingInfo(!showGradingInfo)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Icon icon="material-symbols:grading" className="w-5 h-5" />
                  Grading Information
                  <Icon
                    icon={showGradingInfo ? "material-symbols:expand-less" : "material-symbols:expand-more"}
                    className="w-5 h-5"
                  />
                </button>

                {/* Collapsible Grading Info Section */}
                {showGradingInfo && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Grading Criteria */}
                    {discussion.grading_criteria && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-green-800 mb-1">Grading Criteria:</p>
                        <p className="text-sm text-green-700">{discussion.grading_criteria}</p>
                      </div>
                    )}

                    {/* Rubric Display - Fixed to handle levels array */}
                    {discussion.rubric && Array.isArray(discussion.rubric) && discussion.rubric.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-green-800 mb-3">Scoring Rubric:</p>
                        <div className="space-y-4">
                          {discussion.rubric.map((criterion: any, index: number) => {
                            // Get the criteria name (handle both formats)
                            const criteriaName = criterion.criteria || criterion.criterion || criterion.name || `Criterion ${index + 1}`;
                            // Get levels array or create from flat structure
                            const levels = criterion.levels || [
                              { name: 'Full Credit', points: criterion.points || criterion.maxPoints || 0, description: criterion.description || '' }
                            ];
                            const maxPoints = levels.length > 0 ? Math.max(...levels.map((l: any) => l.points || 0)) : 0;

                            return (
                              <div key={criterion.id || index} className="bg-white rounded-lg border border-green-200 overflow-hidden">
                                {/* Criterion Header */}
                                <div className="bg-green-100 px-4 py-2 flex items-center justify-between">
                                  <span className="font-medium text-green-800">{criteriaName}</span>
                                  <span className="text-sm text-green-700">Max: {maxPoints} pts</span>
                                </div>

                                {/* Levels Table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="text-left px-4 py-2 font-medium text-gray-700 w-32">Level</th>
                                        <th className="text-center px-4 py-2 font-medium text-gray-700 w-20">Points</th>
                                        <th className="text-left px-4 py-2 font-medium text-gray-700">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {levels.map((level: any, levelIdx: number) => (
                                        <tr key={levelIdx} className="border-t border-gray-100">
                                          <td className="px-4 py-2 text-gray-800 font-medium">{level.name || `Level ${levelIdx + 1}`}</td>
                                          <td className="px-4 py-2 text-center">
                                            <span className="inline-flex items-center justify-center w-10 h-6 rounded bg-green-100 text-green-800 font-medium">
                                              {level.points}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-gray-600">{level.description || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Total Points Summary */}
                        <div className="mt-3 p-3 bg-green-100 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-green-800">Total Possible Points:</span>
                            <span className="font-bold text-green-900">{discussion.points} pts</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    {(discussion.min_replies || discussion.min_words) && (
                      <div className="border-t border-green-200 pt-3 mt-3">
                        <p className="text-sm font-semibold text-green-800 mb-2">Requirements:</p>
                        <div className="flex flex-wrap gap-4 text-sm text-green-700">
                          {discussion.min_replies && discussion.min_replies > 0 && (
                            <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-green-200">
                              <Icon icon="material-symbols:chat" className="w-4 h-4 text-green-600" />
                              Minimum replies: <strong>{discussion.min_replies}</strong>
                            </span>
                          )}
                          {discussion.min_words && discussion.min_words > 0 && (
                            <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-green-200">
                              <Icon icon="material-symbols:text-fields" className="w-4 h-4 text-green-600" />
                              Minimum words: <strong>{discussion.min_words}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Instructor Grading Actions */}
            {discussion.is_graded && isInstructor && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                      <Icon icon="material-symbols:grade" className="w-4 h-4" />
                      Graded Discussion
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      {discussion.points} points possible
                      {discussion.due_date && ` • Due: ${new Date(discussion.due_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGrader(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:edit-note" className="w-4 h-4" />
                    Grade Submissions
                  </button>
                </div>
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{discussion.title}</h1>
            
            <div className="prose max-w-none mb-6">
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(discussion.content) }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>by {discussion.author.name}</span>
                <span>•</span>
                <span>{formatDate(discussion.created_at)}</span>
              </div>

              <div className="flex items-center gap-2">
                {user && (user.id === discussion.author.id || isInstructor) && !isEditing && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this discussion? All replies will also be deleted.')) return;
                        try {
                          const res = await fetch(`/api/discussions/${discussionId}`, { method: 'DELETE' });
                          if (res.ok) {
                            window.location.href = `/course/${courseId}`;
                          } else {
                            const data = await res.json();
                            alert(data.error || 'Failed to delete discussion');
                          }
                        } catch (err) {
                          console.error('Error deleting discussion:', err);
                          alert('Failed to delete discussion');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Icon icon="mdi:delete-outline" className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleVote(discussion.id, 'up')}
                  className="flex items-center gap-1 px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V18m-7-8l3-3m0 0l3 3m-3-3v12" />
                  </svg>
                  {getVoteCount(discussion.votes)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
