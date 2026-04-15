"use client";

import React from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/ui/Button";

interface SurveyPlayerProps {
  surveyId: string;
  courseId?: string;
  onComplete?: () => void;
  onClose?: () => void;
}

interface Answer {
  question_id: string;
  answer: any;
}

export default function SurveyPlayer({
  surveyId,
  courseId,
  onComplete,
  onClose
}: SurveyPlayerProps) {
  const [survey, setSurvey] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [responseId, setResponseId] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Answer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [thankYouMessage, setThankYouMessage] = React.useState<string>('');
  const [validationErrors, setValidationErrors] = React.useState<Set<string>>(new Set());

  // Load survey and start response
  React.useEffect(() => {
    loadSurveyAndStartResponse();
  }, [surveyId]);

  async function loadSurveyAndStartResponse() {
    setLoading(true);
    setError(null);

    try {
      // Load survey
      const surveyResponse = await fetch(`/api/surveys/${surveyId}`);
      if (!surveyResponse.ok) {
        const data = await surveyResponse.json();
        throw new Error(data.error || 'Failed to load survey');
      }

      const surveyData = await surveyResponse.json();
      setSurvey(surveyData);

      // Check if already completed
      if (surveyData.has_responded && !surveyData.can_respond) {
        setError('You have already completed this survey');
        return;
      }

      // Start response
      const startResponse = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId })
      });

      if (!startResponse.ok) {
        const data = await startResponse.json();
        throw new Error(data.error || 'Failed to start survey');
      }

      const responseData = await startResponse.json();
      setResponseId(responseData.response?.id);

      // Initialize answers from existing response (if resuming)
      if (responseData.response?.answers) {
        setAnswers(responseData.response.answers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  }

  function getAnswer(questionId: string) {
    return answers.find(a => a.question_id === questionId)?.answer;
  }

  function setAnswer(questionId: string, value: any) {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.question_id === questionId);
      if (existing >= 0) {
        const newAnswers = [...prev];
        newAnswers[existing] = { question_id: questionId, answer: value };
        return newAnswers;
      }
      return [...prev, { question_id: questionId, answer: value }];
    });
    // Clear validation error for this question
    setValidationErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
  }

  async function saveProgress() {
    if (!responseId) return;

    try {
      await fetch(`/api/surveys/${surveyId}/responses/${responseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }

  function validateAnswers(): boolean {
    const errors = new Set<string>();
    const questions = survey?.survey_questions || [];

    for (const q of questions) {
      if (q.required) {
        const answer = getAnswer(q.id);
        if (answer === undefined || answer === null || answer === '' ||
            (Array.isArray(answer) && answer.length === 0)) {
          errors.add(q.id);
        }
      }
    }

    setValidationErrors(errors);
    return errors.size === 0;
  }

  async function handleSubmit() {
    if (!validateAnswers()) {
      // Scroll to first error
      const firstError = Array.from(validationErrors)[0];
      const questions = survey?.survey_questions || [];
      const errorIndex = questions.findIndex((q: any) => q.id === firstError);
      if (errorIndex >= 0) {
        setCurrentQuestionIndex(errorIndex);
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses/${responseId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit survey');
      }

      const data = await response.json();
      setThankYouMessage(data.thank_you_message || 'Thank you for completing this survey!');
      setSubmitted(true);

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    const questions = survey?.survey_questions || [];
    if (currentQuestionIndex < questions.length - 1) {
      saveProgress();
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }

  function handlePrevious() {
    if (currentQuestionIndex > 0) {
      saveProgress();
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Icon icon="material-symbols:progress-activity" className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="p-8 text-center">
        <Icon icon="material-symbols:error" className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
        {onClose && (
          <Button variant="secondary" onClick={onClose} className="mt-4">
            Close
          </Button>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Icon icon="material-symbols:check" className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-medium text-gray-900 mb-2">Survey Submitted</h2>
        <p className="text-gray-600 mb-6">{thankYouMessage}</p>
        {onClose && (
          <Button onClick={onClose}>Close</Button>
        )}
      </div>
    );
  }

  const questions = survey?.survey_questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">{survey.title}</h1>
        {survey.description && (
          <p className="text-sm text-gray-600 mt-1">{survey.description}</p>
        )}
      </div>

      {/* Progress bar */}
      {survey.show_progress_bar && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Instructions */}
      {survey.instructions && currentQuestionIndex === 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-1">Instructions</h3>
          <p className="text-sm text-blue-700">{survey.instructions}</p>
        </div>
      )}

      {/* Current Question */}
      {currentQuestion && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            {currentQuestion.category && (
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {currentQuestion.category}
              </span>
            )}
            <h2 className="text-lg font-medium text-gray-900">
              {currentQuestion.question_text}
              {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
            </h2>
            {currentQuestion.description && (
              <p className="text-sm text-gray-500 mt-1">{currentQuestion.description}</p>
            )}
          </div>

          {validationErrors.has(currentQuestion.id) && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              This question is required
            </div>
          )}

          <QuestionInput
            question={currentQuestion}
            value={getAnswer(currentQuestion.id)}
            onChange={(value) => setAnswer(currentQuestion.id, value)}
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <Icon icon="material-symbols:arrow-back" className="w-4 h-4 mr-1" />
          <span>Previous</span>
        </Button>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button onClick={handleNext}>
            <span>Next</span>
            <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Icon icon="material-symbols:progress-activity" className="w-4 h-4 mr-1 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Submit Survey</span>
                <Icon icon="material-symbols:check" className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Question navigation dots */}
      <div className="flex justify-center gap-1 mt-6">
        {questions.map((_: any, idx: number) => {
          const questionId = questions[idx]?.id;
          const hasAnswer = answers.some(a => a.question_id === questionId);
          const hasError = validationErrors.has(questionId);

          return (
            <button
              key={idx}
              onClick={() => {
                saveProgress();
                setCurrentQuestionIndex(idx);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx === currentQuestionIndex
                  ? 'bg-blue-600'
                  : hasError
                    ? 'bg-red-400'
                    : hasAnswer
                      ? 'bg-green-400'
                      : 'bg-gray-300'
              }`}
              title={`Question ${idx + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// Question Input Component
function QuestionInput({
  question,
  value,
  onChange
}: {
  question: any;
  value: any;
  onChange: (value: any) => void;
}) {
  const options = question.options || {};

  switch (question.type) {
    case 'likert_scale':
      const likertMin = options.min || 1;
      const likertMax = options.max || 5;
      const likertLabels = options.labels || [];
      const likertRange = Array.from(
        { length: likertMax - likertMin + 1 },
        (_, i) => likertMin + i
      );

      return (
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-gray-500">
            {likertLabels[0] && <span>{likertLabels[0]}</span>}
            {likertLabels[likertLabels.length - 1] && (
              <span>{likertLabels[likertLabels.length - 1]}</span>
            )}
          </div>
          <div className="flex justify-center gap-2">
            {likertRange.map((num) => (
              <button
                key={num}
                onClick={() => onChange(num)}
                className={`w-12 h-12 rounded-full border-2 text-sm font-medium transition-all ${
                  value === num
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-blue-400'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          {likertLabels.length > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              {likertRange.map((num, idx) => (
                <span key={num} className="w-12 text-center">
                  {likertLabels[idx] || ''}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    case 'rating_scale':
    case 'nps':
      const ratingMin = options.min ?? (question.type === 'nps' ? 0 : 1);
      const ratingMax = options.max || 10;
      const ratingRange = Array.from(
        { length: ratingMax - ratingMin + 1 },
        (_, i) => ratingMin + i
      );

      return (
        <div className="space-y-3">
          {question.type === 'nps' && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Not at all likely</span>
              <span>Extremely likely</span>
            </div>
          )}
          <div className="flex justify-center gap-1 flex-wrap">
            {ratingRange.map((num) => (
              <button
                key={num}
                onClick={() => onChange(num)}
                className={`w-10 h-10 rounded border text-sm font-medium transition-all ${
                  value === num
                    ? question.type === 'nps'
                      ? num >= 9
                        ? 'bg-green-600 border-green-600 text-white'
                        : num >= 7
                          ? 'bg-yellow-500 border-yellow-500 text-white'
                          : 'bg-red-500 border-red-500 text-white'
                      : 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-blue-400'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      );

    case 'slider':
      const sliderMin = options.min || 0;
      const sliderMax = options.max || 100;
      const sliderStep = options.step || 1;

      return (
        <div className="space-y-4">
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={value ?? sliderMin}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{sliderMin}</span>
            <span className="font-medium">{value ?? sliderMin}</span>
            <span>{sliderMax}</span>
          </div>
        </div>
      );

    case 'multiple_choice':
      const mcOptions = Array.isArray(options) ? options : [];
      return (
        <div className="space-y-2">
          {mcOptions.map((opt: any) => (
            <label
              key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                value === opt.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-900">{opt.text}</span>
            </label>
          ))}
        </div>
      );

    case 'multiple_select':
      const msOptions = Array.isArray(options) ? options : [];
      const selectedOptions = Array.isArray(value) ? value : [];

      return (
        <div className="space-y-2">
          {msOptions.map((opt: any) => (
            <label
              key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedOptions.includes(opt.id)
                  ? 'bg-blue-50 border-blue-300'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedOptions.includes(opt.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedOptions, opt.id]);
                  } else {
                    onChange(selectedOptions.filter((id: string) => id !== opt.id));
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-900">{opt.text}</span>
            </label>
          ))}
        </div>
      );

    case 'ranking':
      const rankOptions = Array.isArray(options) ? options : [];
      const rankedItems = Array.isArray(value) ? value : [];
      const unrankedItems = rankOptions.filter((opt: any) => !rankedItems.includes(opt.id));

      return (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Click items to rank them in order</p>

          {rankedItems.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Ranked:</p>
              {rankedItems.map((id: string, idx: number) => {
                const item = rankOptions.find((opt: any) => opt.id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded"
                  >
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-900 flex-1">{item?.text}</span>
                    <button
                      onClick={() => onChange(rankedItems.filter((i: string) => i !== id))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Icon icon="material-symbols:close" className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {unrankedItems.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Click to rank:</p>
              {unrankedItems.map((opt: any) => (
                <button
                  key={opt.id}
                  onClick={() => onChange([...rankedItems, opt.id])}
                  className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}
        </div>
      );

    case 'matrix':
      const matrixRows = options.rows || [];
      const matrixCols = options.columns || [];
      const matrixValue = typeof value === 'object' && value !== null ? value : {};

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2"></th>
                {matrixCols.map((col: any) => (
                  <th key={col.id} className="p-2 text-center text-gray-600 font-medium">
                    {col.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row: any) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2 text-gray-900">{row.text}</td>
                  {matrixCols.map((col: any) => (
                    <td key={col.id} className="p-2 text-center">
                      <input
                        type="radio"
                        name={`${question.id}-${row.id}`}
                        checked={matrixValue[row.id] === col.id}
                        onChange={() => onChange({ ...matrixValue, [row.id]: col.id })}
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'text':
      const textMaxLength = options.maxLength || 500;
      return (
        <div>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={3}
            maxLength={textMaxLength}
            placeholder="Enter your response..."
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            {(value?.length || 0)} / {textMaxLength} characters
          </p>
        </div>
      );

    case 'essay':
      const essayMinLength = options.minLength || 50;
      const essayMaxLength = options.maxLength || 2000;
      const currentLength = value?.length || 0;

      return (
        <div>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={6}
            maxLength={essayMaxLength}
            placeholder="Enter your detailed response..."
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className={`text-xs mt-1 ${
            currentLength < essayMinLength ? 'text-orange-500' : 'text-gray-500'
          }`}>
            {currentLength} / {essayMaxLength} characters
            {currentLength < essayMinLength && ` (minimum ${essayMinLength})`}
          </p>
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-500">
          Unsupported question type: {question.type}
        </div>
      );
  }
}
