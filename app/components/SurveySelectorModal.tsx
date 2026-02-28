'use client';

import React from 'react';
import { Icon } from '@iconify/react';

interface Survey {
  id: string;
  title: string;
  description?: string;
  published: boolean;
  survey_type?: string;
  is_anonymous?: boolean;
  response_count?: number;
  created_at?: string;
}

interface SurveySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (surveyId: string) => void;
  courseId?: string | null;
  lessonId?: string;
}

export default function SurveySelectorModal({
  isOpen,
  onClose,
  onSelect,
  courseId,
  lessonId
}: SurveySelectorModalProps) {
  const [surveys, setSurveys] = React.useState<Survey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSurveyId, setSelectedSurveyId] = React.useState<string | null>(null);

  // Fetch surveys when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    async function fetchSurveys() {
      setLoading(true);
      try {
        // Fetch surveys - optionally filter by course
        let url = '/api/surveys';
        if (courseId) {
          url += `?course_id=${courseId}`;
        }

        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setSurveys(data.surveys || []);
        }
      } catch (error) {
        console.error('Error fetching surveys:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSurveys();
  }, [isOpen, courseId]);

  // Filter surveys based on search
  const filteredSurveys = React.useMemo(() => {
    if (!searchQuery.trim()) return surveys;
    const query = searchQuery.toLowerCase();
    return surveys.filter(
      s => s.title.toLowerCase().includes(query) ||
           s.description?.toLowerCase().includes(query) ||
           s.survey_type?.toLowerCase().includes(query)
    );
  }, [surveys, searchQuery]);

  const handleSelect = () => {
    if (selectedSurveyId) {
      onSelect(selectedSurveyId);
      onClose();
    }
  };

  const handleCreateNew = () => {
    // Open survey creation in a new tab with lesson_id and course_id
    let url = '/surveys/create';
    const params = new URLSearchParams();
    if (lessonId) params.set('lesson_id', lessonId);
    if (courseId) params.set('course_id', courseId);
    if (params.toString()) url += `?${params.toString()}`;

    window.open(url, '_blank');
  };

  const getSurveyTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      'course_evaluation': 'Course Evaluation',
      'lesson_feedback': 'Lesson Feedback',
      'instructor_evaluation': 'Instructor Evaluation',
      'nps': 'NPS Survey',
      'custom': 'Custom Survey'
    };
    return labels[type || ''] || 'Survey';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select Survey</h2>
            <p className="text-sm text-gray-500 mt-1">Choose an existing survey or create a new one</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="material-symbols:close" className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="relative">
            <Icon
              icon="material-symbols:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search surveys..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            />
          </div>
        </div>

        {/* Survey List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="material-symbols:hourglass-empty" className="w-8 h-8 text-gray-400 animate-spin" />
              <span className="ml-3 text-gray-500">Loading surveys...</span>
            </div>
          ) : filteredSurveys.length === 0 ? (
            <div className="text-center py-12">
              <Icon icon="material-symbols:poll" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No surveys found' : 'No surveys available'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery
                  ? 'Try a different search term or create a new survey'
                  : 'Create your first survey to get started'
                }
              </p>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                <Icon icon="material-symbols:add" className="w-5 h-5" />
                Create New Survey
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSurveys.map((survey) => (
                <button
                  key={survey.id}
                  onClick={() => setSelectedSurveyId(survey.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedSurveyId === survey.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      selectedSurveyId === survey.id ? 'bg-teal-100' : 'bg-gray-100'
                    }`}>
                      <Icon
                        icon="material-symbols:poll"
                        className={`w-6 h-6 ${
                          selectedSurveyId === survey.id ? 'text-teal-600' : 'text-gray-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{survey.title}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          survey.published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {survey.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {survey.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{survey.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:category" className="w-3 h-3" />
                          {getSurveyTypeLabel(survey.survey_type)}
                        </span>
                        {survey.is_anonymous && (
                          <span className="flex items-center gap-1">
                            <Icon icon="material-symbols:visibility-off" className="w-3 h-3" />
                            Anonymous
                          </span>
                        )}
                        {survey.response_count !== undefined && (
                          <span className="flex items-center gap-1">
                            <Icon icon="material-symbols:group" className="w-3 h-3" />
                            {survey.response_count} responses
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedSurveyId === survey.id && (
                      <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-teal-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider with Create New option */}
        {filteredSurveys.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <Icon icon="material-symbols:add-circle-outline" className="w-5 h-5" />
              Create New Survey
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedSurveyId}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Select Survey
          </button>
        </div>
      </div>
    </div>
  );
}
