'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import { useSupabase } from '@/lib/supabase-provider';
import TextEditor from '@/app/components/editor/TextEditor';
import { Icon } from '@iconify/react';
import DiscussionGrader from './DiscussionGrader';
import { sanitizeHtml } from '@/lib/sanitize';

interface Author {
  id: string;
  name: string;
  email: string;
}

interface Reply {
  id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  updated_at: string;
  author: Author;
  children: Reply[];
  votes: { count: number }[];
  discussion_id?: string;
  parent_reply_id?: string;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author: Author;
  votes: { count: number }[];
  // Grading fields
  is_graded?: boolean;
  points?: number;
  rubric?: any;
  due_date?: string;
  grading_criteria?: string;
  min_replies?: number;
  min_words?: number;
}

interface RubricCriterion {
  id: string;
  criteria: string;
  levels: { name: string; description: string; points: number }[];
}

interface RubricTemplate {
  id: string;
  name: string;
  description?: string;
  rubric: RubricCriterion[];
  is_system: boolean;
}

interface DiscussionDetailProps {
  courseId: string;
  discussionId: string;
}

export default function DiscussionDetail({ courseId, discussionId }: DiscussionDetailProps) {
  const { user, supabase } = useSupabase();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showGrader, setShowGrader] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Edit mode grading fields
  const [editIsGraded, setEditIsGraded] = useState(false);
  const [editPoints, setEditPoints] = useState<number>(100);
  const [editDueDate, setEditDueDate] = useState('');
  const [editGradingCriteria, setEditGradingCriteria] = useState('');
  const [editMinReplies, setEditMinReplies] = useState<number>(2);
  const [editMinWords, setEditMinWords] = useState<number>(100);
  const [editRubric, setEditRubric] = useState<RubricCriterion[]>([]);
  const [showRubricBuilder, setShowRubricBuilder] = useState(false);
  const [rubricTemplates, setRubricTemplates] = useState<RubricTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generatingAIRubric, setGeneratingAIRubric] = useState(false);
  const [showGradingInfo, setShowGradingInfo] = useState(false);

  const isInstructor = userRole && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userRole);

  // Fetch user profile for role detection
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/auth/profile', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
              const profile = await res.json();
              setUserRole(profile?.role || 'student');
              return;
            }
          }
          setUserRole(user.user_metadata?.role || 'student');
        } catch (error) {
          console.error('Error fetching profile:', error);
          setUserRole(user.user_metadata?.role || 'student');
        }
      }
    };
    fetchUserProfile();
  }, [user, supabase]);

  useEffect(() => {
    fetchDiscussion();
  }, [discussionId]);

  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/discussions/${discussionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch discussion');
      }
      const data = await response.json();
      setDiscussion(data.discussion);
      setReplies(data.replies || []);
    } catch (err: any) {
      console.error('Error fetching discussion:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleVote = async (discussionId: string, voteType: 'up' | 'down') => {
    try {
      const response = await fetch('/api/discussions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discussion_id: discussionId,
          vote_type: voteType
        })
      });

      if (response.ok) {
        fetchDiscussion(); // Refresh to get updated vote counts
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleReplyVote = async (replyId: string, voteType: 'up' | 'down') => {
    try {
      const response = await fetch('/api/discussions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_id: replyId,
          vote_type: voteType
        })
      });

      if (response.ok) {
        fetchDiscussion(); // Refresh to get updated vote counts
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleEdit = () => {
    if (discussion) {
      setEditTitle(discussion.title);
      setEditContent(discussion.content);
      // Initialize grading fields
      setEditIsGraded(discussion.is_graded || false);
      setEditPoints(discussion.points || 100);
      setEditDueDate(discussion.due_date ? discussion.due_date.split('T')[0] : '');
      setEditGradingCriteria(discussion.grading_criteria || '');
      setEditMinReplies(discussion.min_replies || 2);
      setEditMinWords(discussion.min_words || 100);
      setEditRubric(discussion.rubric || []);
      setShowRubricBuilder(false);
      setIsEditing(true);
      // Fetch rubric templates if instructor
      if (isInstructor && rubricTemplates.length === 0) {
        fetchRubricTemplates();
      }
    }
  };

  const fetchRubricTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/discussions/rubric-templates', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRubricTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching rubric templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (template: RubricTemplate) => {
    setEditRubric(template.rubric);
    setShowRubricBuilder(true);
  };

  const generateAIRubric = async () => {
    setGeneratingAIRubric(true);
    try {
      const response = await fetch('/api/ai/rubric-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source: 'discussion',
          discussionId: discussionId,
          criteriaCount: 4,
          rubricType: 'discussion',
          maxPoints: editPoints || 100
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.rubric && data.rubric.length > 0) {
          setEditRubric(data.rubric);
          setShowRubricBuilder(true);
        }
      }
    } catch (err) {
      console.error('Error generating AI rubric:', err);
    } finally {
      setGeneratingAIRubric(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert('Title and content are required');
      return;
    }

    if (editIsGraded && (!editPoints || editPoints <= 0)) {
      alert('Points must be a positive number for graded discussions');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        title: editTitle.trim(),
        content: editContent.trim()
      };

      // Include grading fields if instructor
      if (isInstructor) {
        payload.is_graded = editIsGraded;
        if (editIsGraded) {
          payload.points = editPoints;
          payload.due_date = editDueDate || null;
          payload.grading_criteria = editGradingCriteria;
          payload.min_replies = editMinReplies;
          payload.min_words = editMinWords;
          payload.rubric = editRubric.length > 0 ? editRubric : null;
        }
      }

      const response = await fetch(`/api/discussions/${discussionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsEditing(false);
        fetchDiscussion();
        alert('Discussion updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update discussion: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating discussion:', err);
      alert(`Failed to update discussion: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const res = await fetch(`/api/discussions/${discussionId}/replies/${replyId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDiscussion();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete reply');
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      alert('Failed to delete reply');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
    setEditIsGraded(false);
    setEditPoints(100);
    setEditDueDate('');
    setEditGradingCriteria('');
    setEditMinReplies(2);
    setEditMinWords(100);
    setEditRubric([]);
    setShowRubricBuilder(false);
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
                      onClick={handleEdit}
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
      {isEditing && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Discussion</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green"
                placeholder="Discussion title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <TextEditor
                value={editContent}
                onChange={setEditContent}
              />
            </div>

            {/* Grading Settings - Only for instructors */}
            {isInstructor && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="editIsGraded"
                    checked={editIsGraded}
                    onChange={(e) => setEditIsGraded(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="editIsGraded" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Icon icon="material-symbols:grade" className="w-5 h-5 text-amber-600" />
                    Graded Discussion
                  </label>
                </div>

                {editIsGraded && (
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Points
                        </label>
                        <input
                          type="number"
                          value={editPoints}
                          onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                          min={1}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Replies Required
                        </label>
                        <input
                          type="number"
                          value={editMinReplies}
                          onChange={(e) => setEditMinReplies(parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Words Per Post
                        </label>
                        <input
                          type="number"
                          value={editMinWords}
                          onChange={(e) => setEditMinWords(parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grading Criteria (Text Description)
                      </label>
                      <textarea
                        value={editGradingCriteria}
                        onChange={(e) => setEditGradingCriteria(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Describe how students will be graded..."
                      />
                    </div>

                    {/* Rubric Section */}
                    <div className="border-t border-amber-300 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Icon icon="material-symbols:table-chart" className="w-5 h-5 text-green-600" />
                          Grading Rubric
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowRubricBuilder(!showRubricBuilder)}
                          className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1"
                        >
                          {showRubricBuilder ? (
                            <>
                              <Icon icon="material-symbols:expand-less" className="w-4 h-4" />
                              Hide Rubric Builder
                            </>
                          ) : (
                            <>
                              <Icon icon="material-symbols:expand-more" className="w-4 h-4" />
                              {editRubric.length > 0 ? 'Edit Rubric' : 'Add Rubric'}
                            </>
                          )}
                        </button>
                      </div>

                      {/* Rubric Templates */}
                      {!showRubricBuilder && editRubric.length === 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-3">Start with a template or generate with AI:</p>
                          {loadingTemplates ? (
                            <div className="flex items-center gap-2 text-gray-500">
                              <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 animate-spin" />
                              Loading templates...
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {rubricTemplates.map(template => (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => applyTemplate(template)}
                                  className="px-3 py-2 text-sm bg-white border border-green-300 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2"
                                >
                                  {template.is_system && <Icon icon="material-symbols:verified" className="w-4 h-4 text-green-600" />}
                                  {template.name}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditRubric([{
                                    id: crypto.randomUUID(),
                                    criteria: 'New Criteria',
                                    levels: [
                                      { name: 'Excellent', description: '', points: 25 },
                                      { name: 'Good', description: '', points: 20 },
                                      { name: 'Satisfactory', description: '', points: 15 },
                                      { name: 'Needs Improvement', description: '', points: 10 }
                                    ]
                                  }]);
                                  setShowRubricBuilder(true);
                                }}
                                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <Icon icon="material-symbols:add" className="w-4 h-4" />
                                Create Custom
                              </button>
                              <button
                                type="button"
                                onClick={generateAIRubric}
                                disabled={generatingAIRubric}
                                className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {generatingAIRubric ? (
                                  <>
                                    <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Icon icon="material-symbols:auto-awesome" className="w-4 h-4" />
                                    AI Generate
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline Rubric Builder */}
                      {showRubricBuilder && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <InlineRubricBuilder value={editRubric} onChange={setEditRubric} />
                        </div>
                      )}

                      {/* Rubric Summary */}
                      {editRubric.length > 0 && !showRubricBuilder && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <div className="text-sm text-gray-600">
                            <strong>{editRubric.length}</strong> criteria configured
                            (Total: {editRubric.reduce((sum, c) => sum + Math.max(...c.levels.map(l => l.points)), 0)} max points)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
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

// Inline Rubric Builder Component
interface InlineRubricBuilderProps {
  value: RubricCriterion[];
  onChange: (rubric: RubricCriterion[]) => void;
}

function InlineRubricBuilder({ value, onChange }: InlineRubricBuilderProps) {
  const addCriteria = () => {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        criteria: 'New Criteria',
        levels: [
          { name: 'Excellent', description: '', points: 25 },
          { name: 'Good', description: '', points: 20 },
          { name: 'Satisfactory', description: '', points: 15 },
          { name: 'Needs Improvement', description: '', points: 10 }
        ]
      }
    ]);
  };

  const removeCriteria = (id: string) => {
    onChange(value.filter(c => c.id !== id));
  };

  const updateCriteria = (id: string, field: string, newValue: string) => {
    onChange(value.map(c => c.id === id ? { ...c, [field]: newValue } : c));
  };

  const updateLevel = (criteriaId: string, levelIndex: number, field: string, newValue: string | number) => {
    onChange(value.map(c => {
      if (c.id !== criteriaId) return c;
      const newLevels = [...c.levels];
      newLevels[levelIndex] = { ...newLevels[levelIndex], [field]: newValue };
      return { ...c, levels: newLevels };
    }));
  };

  const addLevel = (criteriaId: string) => {
    onChange(value.map(c => {
      if (c.id !== criteriaId) return c;
      return { ...c, levels: [...c.levels, { name: 'Level', description: '', points: 0 }] };
    }));
  };

  const removeLevel = (criteriaId: string, levelIndex: number) => {
    onChange(value.map(c => {
      if (c.id !== criteriaId) return c;
      const newLevels = c.levels.filter((_, i) => i !== levelIndex);
      return { ...c, levels: newLevels };
    }));
  };

  return (
    <div className="space-y-4">
      {value.map((criterion) => (
        <div key={criterion.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <input
              type="text"
              value={criterion.criteria}
              onChange={(e) => updateCriteria(criterion.id, 'criteria', e.target.value)}
              className="flex-1 font-medium text-gray-800 border-0 bg-transparent focus:ring-0 focus:outline-none px-0"
              placeholder="Criteria name..."
            />
            <button
              type="button"
              onClick={() => removeCriteria(criterion.id)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <Icon icon="material-symbols:delete" className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {criterion.levels.map((level, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => updateLevel(criterion.id, idx, 'name', e.target.value)}
                  className="col-span-2 text-sm rounded border border-gray-300 px-2 py-1"
                  placeholder="Level"
                />
                <input
                  type="text"
                  value={level.description}
                  onChange={(e) => updateLevel(criterion.id, idx, 'description', e.target.value)}
                  className="col-span-8 text-sm rounded border border-gray-300 px-2 py-1"
                  placeholder="Description"
                />
                <input
                  type="number"
                  value={level.points}
                  onChange={(e) => updateLevel(criterion.id, idx, 'points', Number(e.target.value))}
                  className="col-span-1 text-sm rounded border border-gray-300 px-2 py-1 text-center"
                  placeholder="Pts"
                />
                <button
                  type="button"
                  onClick={() => removeLevel(criterion.id, idx)}
                  className="col-span-1 text-red-400 hover:text-red-600"
                  disabled={criterion.levels.length <= 2}
                >
                  <Icon icon="material-symbols:close" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addLevel(criterion.id)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Icon icon="material-symbols:add" className="w-3 h-3" />
            Add Level
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCriteria}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
      >
        <Icon icon="material-symbols:add" className="w-4 h-4" />
        Add Criteria
      </button>
    </div>
  );
}

// Reply Item Component
interface ReplyItemProps {
  reply: Reply;
  onReply: (replyId: string) => void;
  onVote: (replyId: string, voteType: 'up' | 'down') => void;
  onSolution: () => void;
}

function ReplyItem({ reply, onReply, onVote, onSolution, onDelete, isInstructor }: ReplyItemProps & { onDelete: (replyId: string) => void; isInstructor: boolean }) {
  const { user } = useSupabase();
  const [showReplyForm, setShowReplyForm] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVoteCount = (votes: { count: number }[]) => {
    return votes?.[0]?.count || 0;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${reply.is_solution ? 'border-oecs-lime-green bg-oecs-light-green/5' : ''}`}>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V18m-7-8l3-3m0 0l3 3m-3-3v12" />
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
            onClick={async () => {
              try {
                const response = await fetch(`/api/discussions/${reply.discussion_id}/replies`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    content: reply.content,
                    parent_reply_id: reply.parent_reply_id,
                    is_solution: true
                  })
                });
                if (response.ok) onSolution();
              } catch (err) {
                console.error('Error marking as solution:', err);
              }
            }}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            Mark as Solution
          </button>
        )}
      </div>

      {/* Nested Replies */}
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

// Reply Form Component
interface ReplyFormProps {
  discussionId: string;
  parentReplyId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function ReplyForm({ discussionId, parentReplyId, onSuccess, onCancel }: ReplyFormProps) {
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
          parent_reply_id: parentReplyId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create reply');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating reply:', err);
      setError(err.message);
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
          <TextEditor
            value={content}
            onChange={setContent}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

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
