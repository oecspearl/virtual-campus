"use client";

import React from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/Button";

interface SurveyTemplatesProps {
  surveyType?: string;
  onSelect: (template: any) => void;
  onClose: () => void;
}

export default function SurveyTemplates({
  surveyType,
  onSelect,
  onClose
}: SurveyTemplatesProps) {
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null);
  const [filterType, setFilterType] = React.useState(surveyType || '');

  React.useEffect(() => {
    loadTemplates();
  }, [filterType]);

  async function loadTemplates() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterType) params.append('survey_type', filterType);

      const response = await fetch(`/api/surveys/templates?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect() {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'course_evaluation': 'Course Evaluation',
      'instructor_feedback': 'Instructor Feedback',
      'lesson_feedback': 'Lesson Feedback',
      'nps': 'Net Promoter Score',
      'end_of_module': 'End of Module',
      'custom': 'Custom'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'course_evaluation': 'material-symbols:school',
      'instructor_feedback': 'material-symbols:person',
      'lesson_feedback': 'material-symbols:article',
      'nps': 'material-symbols:trending-up',
      'end_of_module': 'material-symbols:flag',
      'custom': 'material-symbols:edit-note'
    };
    return icons[type] || 'material-symbols:description';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Icon icon="material-symbols:description" className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-medium">Survey Templates</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon icon="material-symbols:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Filter */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="course_evaluation">Course Evaluation</option>
            <option value="instructor_feedback">Instructor Feedback</option>
            <option value="lesson_feedback">Lesson Feedback</option>
            <option value="nps">Net Promoter Score</option>
            <option value="end_of_module">End of Module</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="material-symbols:progress-activity" className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Icon icon="material-symbols:folder-open" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No templates available</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedTemplate?.id === template.id ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Icon
                        icon={getTypeIcon(template.survey_type)}
                        className={`w-5 h-5 ${
                          selectedTemplate?.id === template.id ? 'text-green-600' : 'text-gray-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        {template.is_system && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            System
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{getTypeLabel(template.survey_type)}</span>
                        <span>{template.questions?.length || 0} questions</span>
                      </div>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-green-500" />
                    )}
                  </div>

                  {/* Preview questions if selected */}
                  {selectedTemplate?.id === template.id && template.questions?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Questions Preview:</p>
                      <div className="space-y-1">
                        {template.questions.slice(0, 3).map((q: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="text-gray-400">{idx + 1}.</span>
                            <span className="truncate">{q.question_text}</span>
                            <span className="text-gray-400">({q.type})</span>
                          </div>
                        ))}
                        {template.questions.length > 3 && (
                          <p className="text-xs text-gray-400">
                            +{template.questions.length - 3} more questions
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedTemplate}>
            <span>Use Template</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
