"use client";

import React from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/ui/Button";
import { sanitizeHtml } from '@/lib/sanitize';

interface QuizResultProps {
  quiz: any;
  attempt: any;
  questions: any[];
}

export default function QuizResults({ quiz, attempt, questions }: QuizResultProps) {
  const [loadingInsights, setLoadingInsights] = React.useState<{ [key: string]: boolean }>({});
  const [insights, setInsights] = React.useState<{ [key: string]: string }>({});
  const [insightsError, setInsightsError] = React.useState<{ [key: string]: string }>({});
  const [isServiceUnavailable, setIsServiceUnavailable] = React.useState<{ [key: string]: boolean }>({});

  // Helper function to resolve answer IDs to text
  function resolveAnswerText(answer: any, question: any): string {
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      if (Array.isArray(answer)) {
        return answer.map((id: string) => {
          const option = question.options?.find((opt: any) => opt.id === id);
          return option ? option.text : id;
        }).join(', ');
      } else {
        const option = question.options?.find((opt: any) => opt.id === answer);
        return option ? option.text : String(answer);
      }
    } else if (question.type === 'short_answer' || question.type === 'essay' || question.type === 'fill_blank') {
      return String(answer || '');
    }
    return String(answer || '');
  }

  // Helper function to get correct answer text
  function getCorrectAnswerText(question: any): string {
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      const correctOptions = question.options?.filter((opt: any) => opt.is_correct) || [];
      if (correctOptions.length === 0) {
        return 'N/A';
      }
      // If multiple correct answers, show all
      return correctOptions.map((opt: any) => opt.text).join(', ');
    } else if (question.type === 'short_answer' || question.type === 'fill_blank') {
      return String(question.correct_answer || 'N/A');
    } else if (question.type === 'essay') {
      return 'Essay question - no single correct answer';
    }
    return 'N/A';
  }

  async function getAIInsights(questionId: string, answerData: any, question: any) {
    setLoadingInsights(prev => ({ ...prev, [questionId]: true }));
    setInsightsError(prev => ({ ...prev, [questionId]: '' }));

    try {
      const userAnswer = resolveAnswerText(answerData.answer, question);
      const correctAnswer = getCorrectAnswerText(question);

      const response = await fetch(`/api/quizzes/${quiz.id}/questions/${questionId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: userAnswer,
          correctAnswer: correctAnswer,
          questionText: question.question_text,
          questionType: question.type,
          options: question.options,
          courseContext: {
            courseId: quiz.course_id,
            quizTitle: quiz.title,
            quizDescription: quiz.description
          }
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned ${response.status}. Please try again later.`);
      }

      const data = await response.json();

      if (!response.ok) {
        // Handle service unavailable (503) as a special case - not really an error
        if (response.status === 503) {
          setInsightsError(prev => ({ 
            ...prev, 
            [questionId]: data.error || 'AI insights are not currently available. Please contact your administrator.' 
          }));
          setIsServiceUnavailable(prev => ({ ...prev, [questionId]: true }));
          return;
        }
        // For other errors, throw to be caught below
        setIsServiceUnavailable(prev => ({ ...prev, [questionId]: false }));
        throw new Error(data.error || 'Failed to get insights');
      }

      setInsights(prev => ({ ...prev, [questionId]: data.insights }));
    } catch (error) {
      console.error('Error getting AI insights:', error);
      setInsightsError(prev => ({ 
        ...prev, 
        [questionId]: error instanceof Error ? error.message : 'Failed to load insights' 
      }));
      setIsServiceUnavailable(prev => ({ ...prev, [questionId]: false }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, [questionId]: false }));
    }
  }

  const pct = Number(attempt.percentage ?? 0);
  const pass = quiz?.passing_score ? pct >= Number(quiz.passing_score) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-gray-900">Quiz Results</h1>
        <a href={`/quiz/${quiz.id}/attempt`} className="text-sm text-[#3B82F6] underline">
          Retake Quiz
        </a>
      </div>

      <div className="rounded-md border p-4 bg-white">
        <div className="text-sm text-gray-800">
          <span>Score: {attempt.score} / {attempt.max_score} ({pct}%)</span>
        </div>
        {pass !== null && (
          <div className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${pass ? "text-[#10B981]" : "text-red-600"}`}>
            <Icon icon={pass ? "mdi:check-circle" : "mdi:close-circle"} className="h-4 w-4" aria-hidden />
            <span>{pass ? "Passed" : "Failed"}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {(attempt.answers ?? []).map((a: any, i: number) => {
          const question = questions.find((q: any) => q.id === a.question_id);
          if (!question) return null;

          const answerText = resolveAnswerText(a.answer, question);
          const correctAnswerText = getCorrectAnswerText(question);
          const isCorrect = a.correct;
          const questionId = question.id;
          const hasInsights = insights[questionId];
          const isLoading = loadingInsights[questionId];
          const error = insightsError[questionId];

          return (
            <div 
              key={i} 
              className={`rounded-md border p-4 ${
                isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800 mb-1">
                    <span>Question {i + 1}</span>
                    {isCorrect ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
                        <Icon icon="mdi:check-circle" className="h-3.5 w-3.5" aria-hidden />
                        Correct
                      </span>
                    ) : (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-700 font-semibold">
                        <Icon icon="mdi:close-circle" className="h-3.5 w-3.5" aria-hidden />
                        Incorrect
                      </span>
                    )}
                  </div>
                  <div 
                    className="mt-2 text-sm text-gray-700" 
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.question_text) }} 
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Your answer: </span>
                  <span className={`${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {answerText || '(No answer provided)'}
                  </span>
                </div>
                
                {!isCorrect && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Correct answer: </span>
                    <span className="text-green-700">{correctAnswerText}</span>
                  </div>
                )}

                <div className="text-xs text-gray-600">
                  <span>Points earned: {a.points_earned} / {question.points || 1}</span>
                </div>

                {quiz?.show_correct_answers && a.feedback && (
                  <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded mt-2">
                    <span>{a.feedback}</span>
                  </div>
                )}

                {/* AI Insights Section - Only show for incorrect answers */}
                {!isCorrect && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    {!hasInsights && !isLoading && !error && (
                      <Button
                        variant="outline"
                        onClick={() => getAIInsights(questionId, a, question)}
                        className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
                      >
                        <Icon icon="mdi:robot-outline" className="h-3.5 w-3.5" aria-hidden />
                        Get AI Insights
                      </Button>
                    )}

                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Generating AI insights...</span>
                      </div>
                    )}

                    {error && (
                      <div className={`text-sm p-2 rounded ${
                        isServiceUnavailable[questionId] 
                          ? 'text-amber-700 bg-amber-50 border border-amber-200' 
                          : 'text-red-600 bg-red-50'
                      }`}>
                        <span>{error}</span>
                        {!isServiceUnavailable[questionId] && (
                          <button
                            onClick={() => getAIInsights(questionId, a, question)}
                            className="ml-2 text-xs underline"
                          >
                            Try again
                          </button>
                        )}
                      </div>
                    )}

                    {hasInsights && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-800">AI Learning Insights</h4>
                          <button
                            onClick={() => setInsights(prev => {
                              const newInsights = { ...prev };
                              delete newInsights[questionId];
                              return newInsights;
                            })}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Hide
                          </button>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-gray-700 prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(insights[questionId].replace(/\n/g, '<br />')) }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

