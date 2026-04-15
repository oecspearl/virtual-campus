"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Button from "@/app/components/ui/Button";
import { useSupabase } from "@/lib/supabase-provider";

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase } = useSupabase();
  const surveyId = params.id as string;

  const [survey, setSurvey] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);

  // Check if user can manage surveys (instructor, curriculum_designer, admin, super_admin)
  const canManage = userRole && ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(userRole);
  const isCreator = userId && survey?.creator_id === userId;
  const hasAdminAccess = canManage || isCreator;

  React.useEffect(() => {
    loadUserProfile();
    loadSurvey();
  }, [surveyId]);

  async function loadUserProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          setUserRole(profile?.role || 'student');
          setUserId(profile?.id || null);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function loadSurvey() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) {
        throw new Error('Survey not found');
      }
      const data = await response.json();
      setSurvey(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete survey');
      }
      router.push('/surveys');
    } catch (err) {
      alert('Failed to delete survey');
    } finally {
      setDeleting(false);
    }
  }

  async function handlePublishToggle() {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !survey.published })
      });

      if (!response.ok) {
        throw new Error('Failed to update survey');
      }

      loadSurvey();
    } catch (err) {
      alert('Failed to update survey');
    }
  }

  function getSurveyTypeLabel(type: string) {
    const labels: Record<string, string> = {
      'course_evaluation': 'Course Evaluation',
      'lesson_feedback': 'Lesson Feedback',
      'instructor_evaluation': 'Instructor Evaluation',
      'nps': 'Net Promoter Score',
      'custom': 'Custom Survey'
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="material-symbols:progress-activity" className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Icon icon="material-symbols:error" className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-gray-600">{error || 'Survey not found'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  const questions = survey.survey_questions || [];

  // For students: show a simplified view with just the take survey option
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-8 text-center">
              <Icon icon="material-symbols:poll" className="w-12 h-12 text-white mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">{survey.title}</h1>
              {survey.description && (
                <p className="text-teal-100">{survey.description}</p>
              )}
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 mb-6">
                <span className="flex items-center gap-1">
                  <Icon icon="material-symbols:help-outline" className="w-4 h-4" />
                  {questions.length} questions
                </span>
                {survey.is_anonymous && (
                  <span className="flex items-center gap-1">
                    <Icon icon="material-symbols:visibility-off" className="w-4 h-4" />
                    Anonymous
                  </span>
                )}
              </div>

              {survey.instructions && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
                  <p className="text-sm text-gray-600">{survey.instructions}</p>
                </div>
              )}

              {/* Action */}
              <div className="text-center">
                {survey.has_responded && !survey.can_respond ? (
                  <div className="py-4">
                    <Icon icon="material-symbols:check-circle" className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-green-700 font-medium">You have already completed this survey</p>
                    <p className="text-sm text-gray-500 mt-1">Thank you for your feedback!</p>
                  </div>
                ) : (
                  <Link href={`/surveys/${surveyId}/take`}>
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3">
                      <Icon icon="material-symbols:play-arrow" className="w-5 h-5 mr-2" />
                      Start Survey
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For admins/instructors: show the full management view
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/surveys" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          <Icon icon="material-symbols:arrow-back" className="w-4 h-4" />
          Back to Surveys
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-gray-900">{survey.title}</h1>
              {survey.published ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Published</span>
              ) : (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Draft</span>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-4">
              {getSurveyTypeLabel(survey.survey_type)} • {questions.length} questions • {survey.response_count || 0} responses
            </p>

            {survey.description && (
              <p className="text-gray-600 mb-4">{survey.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
              {survey.is_anonymous && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Icon icon="material-symbols:visibility-off" className="w-4 h-4" />
                  Anonymous responses
                </span>
              )}
              {survey.allow_multiple_responses && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Icon icon="material-symbols:repeat" className="w-4 h-4" />
                  Multiple responses allowed
                </span>
              )}
              {survey.randomize_questions && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Icon icon="material-symbols:shuffle" className="w-4 h-4" />
                  Randomized questions
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handlePublishToggle}>
              {survey.published ? (
                <>
                  <Icon icon="material-symbols:unpublished" className="w-4 h-4 mr-1" />
                  <span>Unpublish</span>
                </>
              ) : (
                <>
                  <Icon icon="material-symbols:publish" className="w-4 h-4 mr-1" />
                  <span>Publish</span>
                </>
              )}
            </Button>
            <Link href={`/surveys/${surveyId}/edit`}>
              <Button variant="secondary">
                <Icon icon="material-symbols:edit" className="w-4 h-4 mr-1" />
                <span>Edit</span>
              </Button>
            </Link>
            <Button variant="secondary" onClick={handleDelete} disabled={deleting}>
              <Icon icon="material-symbols:delete" className="w-4 h-4 mr-1" />
              <span>{deleting ? 'Deleting...' : 'Delete'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link href={`/surveys/${surveyId}/take`}>
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
            <Icon icon="material-symbols:play-arrow" className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Preview Survey</h3>
            <p className="text-sm text-gray-500">Test the survey experience</p>
          </div>
        </Link>

        <Link href={`/surveys/${surveyId}/results`}>
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer">
            <Icon icon="material-symbols:analytics" className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">View Results</h3>
            <p className="text-sm text-gray-500">{survey.response_count || 0} responses</p>
          </div>
        </Link>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <Icon icon="material-symbols:link" className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-medium text-gray-900">Share Link</h3>
          <button
            onClick={() => {
              const url = `${window.location.origin}/surveys/${surveyId}/take`;
              navigator.clipboard.writeText(url);
              alert('Link copied to clipboard!');
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Copy survey link
          </button>
        </div>
      </div>

      {/* Questions Preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Questions ({questions.length})</h2>

        {questions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No questions added yet</p>
        ) : (
          <div className="space-y-3">
            {questions.map((q: any, idx: number) => (
              <div key={q.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {q.question_text}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {q.description && (
                      <p className="text-xs text-gray-500 mt-1">{q.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                        {q.type.replace(/_/g, ' ')}
                      </span>
                      {q.category && (
                        <span className="text-xs text-gray-500">{q.category}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
