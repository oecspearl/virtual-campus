'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import { useSupabase } from '@/lib/supabase-provider';
import TextEditor from '@/app/components/editor/TextEditor';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

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
  // Grading fields
  is_graded?: boolean;
  points?: number;
  rubric?: any;
  due_date?: string;
  grading_criteria?: string;
  min_replies?: number;
  min_words?: number;
  show_in_curriculum?: boolean;
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

interface DiscussionListProps {
  courseId: string;
}

export default function DiscussionList({ courseId }: DiscussionListProps) {
  const { user, supabase } = useSupabase();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isInstructor = userRole && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userRole);

  // Fetch user profile/role
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
          console.error('Error fetching user profile:', error);
          setUserRole(user.user_metadata?.role || 'student');
        }
      }
    };
    fetchUserProfile();
  }, [user, supabase]);

  useEffect(() => {
    fetchDiscussions();
  }, [courseId]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/discussions`);
      if (!response.ok) {
        throw new Error('Failed to fetch discussions');
      }
      const data = await response.json();
      setDiscussions(data.discussions || []);
    } catch (err: any) {
      console.error('Error fetching discussions:', err);
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
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Error Loading Discussions</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
        <Button onClick={fetchDiscussions} variant="outline" className="bg-white hover:bg-red-50">
          <Icon icon="material-symbols:refresh" className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Recent Discussions</h2>
          <p className="text-gray-600">Join the conversation and share your thoughts</p>
        </div>
        {user && (
          <motion.button
            onClick={() => setShowCreateForm(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
          >
            <Icon icon="material-symbols:add" className="w-5 h-5" />
            Start Discussion
          </motion.button>
        )}
      </div>

      {/* Create Discussion Form */}
      {showCreateForm && (
        <CreateDiscussionForm
          courseId={courseId}
          isInstructor={isInstructor || false}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchDiscussions();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Discussions List */}
      {discussions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Icon icon="material-symbols:forum" className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No discussions yet</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Be the first to start a meaningful discussion about this course. 
            Share your thoughts, ask questions, and connect with your peers!
          </p>
          {user && (
            <motion.button
              onClick={() => setShowCreateForm(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              <Icon icon="material-symbols:add" className="w-5 h-5" />
              Start First Discussion
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion, index) => (
            <motion.div
              key={discussion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                discussion.is_pinned ? 'border-blue-300 bg-blue-50/50 shadow-md' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Author Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {discussion.author.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {discussion.is_graded && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <Icon icon="material-symbols:grade" className="w-3 h-3" />
                        Graded - {discussion.points} pts
                      </span>
                    )}
                    {discussion.is_graded && discussion.due_date && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                        <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                        Due: {new Date(discussion.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {discussion.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        <Icon icon="material-symbols:push-pin" className="w-3 h-3" />
                        Pinned
                      </span>
                    )}
                    {discussion.is_locked && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        <Icon icon="material-symbols:lock" className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </div>
                  
                  <Link 
                    href={`/course/${courseId}/discussions/${discussion.id}`}
                    className="block group-hover:bg-gray-50/50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3">
                      {discussion.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                      {discussion.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || ''}
                    </p>
                  </Link>

                  {/* Discussion Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Icon icon="material-symbols:person" className="w-4 h-4" />
                        <span className="font-medium">{discussion.author.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon icon="material-symbols:schedule" className="w-4 h-4" />
                        <span>{formatDate(discussion.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Icon icon="material-symbols:reply" className="w-4 h-4" />
                        <span className="font-medium">{getReplyCount(discussion.replies)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Icon icon="material-symbols:thumb-up" className="w-4 h-4" />
                        <span className="font-medium">{getVoteCount(discussion.votes)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Create Discussion Form Component
interface CreateDiscussionFormProps {
  courseId: string;
  isInstructor: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateDiscussionForm({ courseId, isInstructor, onSuccess, onCancel }: CreateDiscussionFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Grading fields
  const [isGraded, setIsGraded] = useState(false);
  const [points, setPoints] = useState<number>(100);
  const [dueDate, setDueDate] = useState<string>('');
  const [gradingCriteria, setGradingCriteria] = useState('');
  const [minReplies, setMinReplies] = useState<number>(2);
  const [minWords, setMinWords] = useState<number>(100);
  const [showInCurriculum, setShowInCurriculum] = useState(true);
  const [showRubricBuilder, setShowRubricBuilder] = useState(false);
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);
  const [rubricTemplates, setRubricTemplates] = useState<RubricTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generatingAIRubric, setGeneratingAIRubric] = useState(false);

  // Fetch rubric templates when grading is enabled
  React.useEffect(() => {
    if (isGraded && isInstructor && rubricTemplates.length === 0) {
      fetchRubricTemplates();
    }
  }, [isGraded, isInstructor]);

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
    setRubric(template.rubric);
    setShowRubricBuilder(true);
  };

  const generateAIRubric = async () => {
    setGeneratingAIRubric(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/rubric-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source: title.trim() ? 'topic' : 'course',
          topic: title.trim() || 'Discussion participation',
          courseId: courseId,
          criteriaCount: 4,
          rubricType: 'discussion',
          maxPoints: points || 100
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate rubric');
      }

      const data = await response.json();
      if (data.rubric && data.rubric.length > 0) {
        setRubric(data.rubric);
        setShowRubricBuilder(true);
      }
    } catch (err: any) {
      console.error('Error generating AI rubric:', err);
      setError(err.message || 'Failed to generate AI rubric');
    } finally {
      setGeneratingAIRubric(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    if (isGraded && (!points || points <= 0)) {
      setError('Points must be a positive number for graded discussions');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        title: title.trim(),
        content: content.trim(),
        is_pinned: isPinned,
        is_locked: isLocked,
      };

      // Add grading fields if graded
      if (isGraded && isInstructor) {
        payload.is_graded = true;
        payload.points = points;
        payload.due_date = dueDate || null;
        payload.grading_criteria = gradingCriteria || null;
        payload.min_replies = minReplies || 0;
        payload.min_words = minWords || 0;
        payload.show_in_curriculum = showInCurriculum;
        if (rubric.length > 0) {
          payload.rubric = rubric;
        }
      }

      const response = await fetch(`/api/courses/${courseId}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create discussion');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating discussion:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
          <Icon icon="material-symbols:edit" className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Start New Discussion</h3>
          <p className="text-gray-600 text-sm">Share your thoughts and engage with the community</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Discussion Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            placeholder="What's your question or topic?"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Discussion Content
          </label>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <TextEditor
              value={content}
              onChange={setContent}
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center gap-2">
                <Icon icon="material-symbols:push-pin" className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Pin this discussion</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center gap-2">
                <Icon icon="material-symbols:lock" className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Lock this discussion</span>
              </div>
            </label>

            {isInstructor && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGraded}
                  onChange={(e) => setIsGraded(e.target.checked)}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <div className="flex items-center gap-2">
                  <Icon icon="material-symbols:grade" className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Make this a graded discussion</span>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Grading Options - Only show for instructors when graded is enabled */}
        {isGraded && isInstructor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-2 border-green-200 bg-green-50 rounded-lg p-6 space-y-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="material-symbols:grade" className="w-5 h-5 text-green-600" />
              <h4 className="text-lg font-semibold text-green-800">Grading Settings</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points Possible *
                </label>
                <input
                  type="number"
                  min="1"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Replies Required
                </label>
                <input
                  type="number"
                  min="0"
                  value={minReplies}
                  onChange={(e) => setMinReplies(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Word Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={minWords}
                  onChange={(e) => setMinWords(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grading Instructions (visible to students)
              </label>
              <textarea
                value={gradingCriteria}
                onChange={(e) => setGradingCriteria(e.target.value)}
                rows={3}
                placeholder="Describe how students will be graded on this discussion..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showInCurriculum}
                onChange={(e) => setShowInCurriculum(e.target.checked)}
                className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Show in course assessment list</span>
            </label>

            {/* Rubric Section */}
            <div className="border-t border-green-200 pt-5 mt-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="material-symbols:table-chart" className="w-5 h-5 text-green-600" />
                  <h5 className="font-semibold text-gray-800">Grading Rubric</h5>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRubricBuilder(!showRubricBuilder)}
                  className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                >
                  {showRubricBuilder ? (
                    <>
                      <Icon icon="material-symbols:expand-less" className="w-4 h-4" />
                      Hide Rubric Builder
                    </>
                  ) : (
                    <>
                      <Icon icon="material-symbols:expand-more" className="w-4 h-4" />
                      {rubric.length > 0 ? 'Edit Rubric' : 'Add Rubric'}
                    </>
                  )}
                </button>
              </div>

              {/* Rubric Templates */}
              {!showRubricBuilder && rubric.length === 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">Start with a template or create your own:</p>
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
                          setRubric([{
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
                  <InlineRubricBuilder value={rubric} onChange={setRubric} />
                </div>
              )}

              {/* Rubric Summary */}
              {rubric.length > 0 && !showRubricBuilder && (
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="text-sm text-gray-600">
                    <strong>{rubric.length}</strong> criteria configured
                    (Total: {rubric.reduce((sum, c) => sum + Math.max(...c.levels.map(l => l.points)), 0)} max points)
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center gap-2">
              <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-4">
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
                Create Discussion
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
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
