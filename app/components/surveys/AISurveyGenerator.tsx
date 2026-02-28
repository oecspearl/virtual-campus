"use client";

import React from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/Button";

interface AISurveyGeneratorProps {
  lessonId?: string;
  courseId?: string;
  surveyType?: string;
  onQuestionsGenerated: (questions: any[]) => void;
  onClose: () => void;
}

const TEMPLATE_TYPES = [
  { value: 'course_evaluation', label: 'Course Evaluation', description: 'Evaluate overall course quality and learning outcomes' },
  { value: 'instructor_feedback', label: 'Instructor Feedback', description: 'Assess teaching effectiveness and communication' },
  { value: 'lesson_feedback', label: 'Lesson Feedback', description: 'Quick feedback on a specific lesson' },
  { value: 'nps', label: 'Net Promoter Score', description: 'Measure satisfaction and likelihood to recommend' },
  { value: 'end_of_module', label: 'End of Module', description: 'Comprehensive module review and readiness check' }
];

const QUESTION_TYPES = [
  { value: 'likert_scale', label: 'Likert Scale' },
  { value: 'rating_scale', label: 'Rating Scale' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'text', label: 'Short Text' },
  { value: 'essay', label: 'Essay' },
  { value: 'nps', label: 'NPS' },
  { value: 'slider', label: 'Slider' }
];

export default function AISurveyGenerator({
  lessonId,
  courseId,
  surveyType: initialSurveyType,
  onQuestionsGenerated,
  onClose
}: AISurveyGeneratorProps) {
  const [source, setSource] = React.useState<string>(
    lessonId ? 'lesson' : courseId ? 'course' : 'template'
  );
  const [templateType, setTemplateType] = React.useState(initialSurveyType || 'course_evaluation');
  const [topic, setTopic] = React.useState('');
  const [questionCount, setQuestionCount] = React.useState(8);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([
    'likert_scale', 'rating_scale', 'multiple_choice', 'text'
  ]);
  const [focusAreas, setFocusAreas] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = React.useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = React.useState<Set<number>>(new Set());

  function toggleQuestionType(type: string) {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }

  function toggleQuestionSelection(index: number) {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  function selectAllQuestions() {
    setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)));
  }

  function deselectAllQuestions() {
    setSelectedQuestions(new Set());
  }

  async function generate() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/survey-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          lessonId: source === 'lesson' ? lessonId : undefined,
          courseId: source === 'course' ? courseId : undefined,
          templateType: source === 'template' ? templateType : undefined,
          topic: source === 'topic' ? topic : undefined,
          questionCount,
          questionTypes: selectedTypes,
          focusAreas: focusAreas ? focusAreas.split(',').map(s => s.trim()) : undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate questions');
      }

      const data = await response.json();
      setGeneratedQuestions(data.questions || []);
      // Select all by default
      setSelectedQuestions(new Set((data.questions || []).map((_: any, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  }

  function addSelectedQuestions() {
    const questionsToAdd = generatedQuestions.filter((_, i) => selectedQuestions.has(i));
    onQuestionsGenerated(questionsToAdd);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Icon icon="material-symbols:auto-awesome" className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-medium">AI Survey Generator</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon icon="material-symbols:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {generatedQuestions.length === 0 ? (
            <div className="space-y-6">
              {/* Source Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generate questions from
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {lessonId && (
                    <button
                      onClick={() => setSource('lesson')}
                      className={`px-3 py-2 text-sm rounded-md border ${
                        source === 'lesson'
                          ? 'bg-purple-50 border-purple-300 text-purple-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Current Lesson
                    </button>
                  )}
                  {courseId && (
                    <button
                      onClick={() => setSource('course')}
                      className={`px-3 py-2 text-sm rounded-md border ${
                        source === 'course'
                          ? 'bg-purple-50 border-purple-300 text-purple-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Current Course
                    </button>
                  )}
                  <button
                    onClick={() => setSource('template')}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      source === 'template'
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Template
                  </button>
                  <button
                    onClick={() => setSource('topic')}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      source === 'topic'
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Custom Topic
                  </button>
                </div>
              </div>

              {/* Template Type (if template source) */}
              {source === 'template' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Type
                  </label>
                  <div className="space-y-2">
                    {TEMPLATE_TYPES.map((type) => (
                      <label
                        key={type.value}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer ${
                          templateType === type.value
                            ? 'bg-purple-50 border-purple-300'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="templateType"
                          value={type.value}
                          checked={templateType === type.value}
                          onChange={(e) => setTemplateType(e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{type.label}</span>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Topic (if topic source) */}
              {source === 'topic' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic or Context
                  </label>
                  <textarea
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Describe the topic or context for your survey questions..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
              )}

              {/* Question Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">{questionCount} questions</div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Types to Include
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => toggleQuestionType(type.value)}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        selectedTypes.includes(type.value)
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Areas (optional)
                </label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., Content quality, Instructor effectiveness, Learning outcomes"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* Generated Questions Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  Generated Questions ({selectedQuestions.size} of {generatedQuestions.length} selected)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllQuestions}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select all
                  </button>
                  <button
                    onClick={deselectAllQuestions}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Deselect all
                  </button>
                  <button
                    onClick={() => setGeneratedQuestions([])}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Generate new
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {generatedQuestions.map((q, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer ${
                      selectedQuestions.has(idx)
                        ? 'bg-purple-50 border-purple-300'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(idx)}
                      onChange={() => toggleQuestionSelection(idx)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                          {q.type}
                        </span>
                        {q.category && (
                          <span className="text-xs text-gray-500">{q.category}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900">{q.question_text}</p>
                      {q.description && (
                        <p className="text-xs text-gray-500 mt-1">{q.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {generatedQuestions.length === 0 ? (
            <Button
              onClick={generate}
              disabled={generating || selectedTypes.length === 0 || (source === 'topic' && !topic)}
            >
              {generating ? (
                <>
                  <Icon icon="material-symbols:progress-activity" className="w-4 h-4 mr-2 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Icon icon="material-symbols:auto-awesome" className="w-4 h-4 mr-2" />
                  <span>Generate Questions</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={addSelectedQuestions}
              disabled={selectedQuestions.size === 0}
            >
              <span>Add {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
