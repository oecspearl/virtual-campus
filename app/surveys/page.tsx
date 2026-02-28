"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Button from "@/app/components/Button";

export default function SurveysListPage() {
  const [surveys, setSurveys] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filterType, setFilterType] = React.useState('');
  const [filterPublished, setFilterPublished] = React.useState<string>('');

  React.useEffect(() => {
    loadSurveys();
  }, [filterType, filterPublished]);

  async function loadSurveys() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterType) params.append('survey_type', filterType);
      if (filterPublished) params.append('published', filterPublished);

      const response = await fetch(`/api/surveys?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load surveys');
      }

      const data = await response.json();
      setSurveys(data.surveys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }

  function getSurveyTypeLabel(type: string) {
    const labels: Record<string, string> = {
      'course_evaluation': 'Course Evaluation',
      'lesson_feedback': 'Lesson Feedback',
      'instructor_evaluation': 'Instructor Evaluation',
      'nps': 'NPS',
      'custom': 'Custom'
    };
    return labels[type] || type;
  }

  function getSurveyTypeColor(type: string) {
    const colors: Record<string, string> = {
      'course_evaluation': 'bg-blue-100 text-blue-700',
      'lesson_feedback': 'bg-green-100 text-green-700',
      'instructor_evaluation': 'bg-purple-100 text-purple-700',
      'nps': 'bg-orange-100 text-orange-700',
      'custom': 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Surveys</h1>
          <p className="text-sm text-gray-500">Create and manage course evaluations and feedback surveys</p>
        </div>
        <Link href="/surveys/create">
          <Button>
            <Icon icon="material-symbols:add" className="w-4 h-4 mr-1" />
            <span>Create Survey</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="course_evaluation">Course Evaluation</option>
          <option value="lesson_feedback">Lesson Feedback</option>
          <option value="instructor_evaluation">Instructor Evaluation</option>
          <option value="nps">NPS</option>
          <option value="custom">Custom</option>
        </select>

        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={filterPublished}
          onChange={(e) => setFilterPublished(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Icon icon="material-symbols:progress-activity" className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-red-50 rounded-lg">
          <Icon icon="material-symbols:error" className="w-12 h-12 text-red-400 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button variant="secondary" onClick={loadSurveys} className="mt-4">
            Retry
          </Button>
        </div>
      ) : surveys.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 rounded-lg">
          <Icon icon="material-symbols:poll" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No surveys yet</h3>
          <p className="text-gray-500 mb-4">Create your first survey to start collecting feedback</p>
          <Link href="/surveys/create">
            <Button>Create Survey</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{survey.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${getSurveyTypeColor(survey.survey_type)}`}>
                      {getSurveyTypeLabel(survey.survey_type)}
                    </span>
                    {survey.published ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Published
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                        Draft
                      </span>
                    )}
                    {survey.is_anonymous && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        Anonymous
                      </span>
                    )}
                  </div>

                  {survey.description && (
                    <p className="text-sm text-gray-600 mb-3">{survey.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:help-outline" className="w-4 h-4" />
                      {survey.question_count || 0} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:groups" className="w-4 h-4" />
                      {survey.response_count || 0} responses
                    </span>
                    {survey.courses && (
                      <span className="flex items-center gap-1">
                        <Icon icon="material-symbols:school" className="w-4 h-4" />
                        {survey.courses.title}
                      </span>
                    )}
                    {survey.lessons && (
                      <span className="flex items-center gap-1">
                        <Icon icon="material-symbols:article" className="w-4 h-4" />
                        {survey.lessons.title}
                      </span>
                    )}
                    <span>Created {new Date(survey.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/surveys/${survey.id}/results`}>
                    <Button variant="secondary" className="text-sm">
                      <Icon icon="material-symbols:analytics" className="w-4 h-4 mr-1" />
                      <span>Results</span>
                    </Button>
                  </Link>
                  <Link href={`/surveys/${survey.id}/edit`}>
                    <Button variant="secondary" className="text-sm">
                      <Icon icon="material-symbols:edit" className="w-4 h-4 mr-1" />
                      <span>Edit</span>
                    </Button>
                  </Link>
                  {survey.published && (
                    <Link href={`/surveys/${survey.id}/take`}>
                      <Button className="text-sm">
                        <Icon icon="material-symbols:play-arrow" className="w-4 h-4 mr-1" />
                        <span>Take</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
