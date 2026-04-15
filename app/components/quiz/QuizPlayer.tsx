"use client";

import React from "react";
import Timer from "@/app/components/ui/Timer";
import Button from "@/app/components/ui/Button";
import ProctorProvider, { useProctor } from "@/app/components/proctoring/ProctorProvider";
import { ProctorSettings, DEFAULT_PROCTOR_SETTINGS } from "@/types/proctor";
import { logQuizAccess, logQuizStart, logQuizSubmit } from "@/lib/activity-tracker";
import { sanitizeHtml } from "@/lib/sanitize";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Question = any;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function QuizPlayer({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = React.useState<Record<string, unknown> | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [index, setIndex] = React.useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [answers, setAnswers] = React.useState<any[]>([]);
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showInstructions, setShowInstructions] = React.useState(true);
  const [quizStatus, setQuizStatus] = React.useState<'loading' | 'available' | 'no_attempts' | 'not_available' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = React.useState<string>('');
  const [existingAttempts, setExistingAttempts] = React.useState<any[]>([]);
  const [proctorConsent, setProctorConsent] = React.useState(false);
  const [showProctorInfo, setShowProctorInfo] = React.useState(false);
  const [effectiveSettings, setEffectiveSettings] = React.useState<{
    due_date: string | null;
    available_from: string | null;
    available_until: string | null;
    time_limit: number | null;
    attempts_allowed: number;
    has_extension: boolean;
  } | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        setQuizStatus('loading');
        
        // Fetch quiz data
        const quizRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}`);
        if (!active) return;
        
        if (!quizRes.ok) {
          const errorData = await quizRes.json().catch(() => ({ error: 'Failed to load quiz' }));
          throw new Error(errorData.error || `Failed to load quiz: ${quizRes.status} ${quizRes.statusText}`);
        }
        
        const qz = await quizRes.json();
        if (!active) return;
        
        // Check if quiz has error property (API returns error in JSON)
        if (qz.error) {
          throw new Error(qz.error);
        }
        
        setQuiz(qz);

        // Log quiz access activity
        logQuizAccess(qz.course_id, quizId, qz.title).catch(console.error);

        // Fetch effective settings (includes per-student extensions if any)
        let eff = {
          available_from: qz.available_from as string | null,
          available_until: qz.available_until as string | null,
          due_date: qz.due_date as string | null,
          time_limit: qz.time_limit as number | null,
          attempts_allowed: Number(qz.attempts_allowed ?? 1),
          has_extension: false,
        };

        try {
          const extRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/extensions/student`);
          if (!active) return;
          if (extRes.ok) {
            const extData = await extRes.json();
            if (extData.effective) {
              eff = extData.effective;
            }
          }
        } catch (extErr) {
          console.error('Error fetching quiz extensions:', extErr);
        }
        setEffectiveSettings(eff);

        // Check quiz availability using effective settings
        const now = new Date();
        const availableFrom = eff.available_from ? new Date(eff.available_from) : null;
        const availableUntil = eff.available_until ? new Date(eff.available_until) : null;

        if (availableFrom && now < availableFrom) {
          setQuizStatus('not_available');
          setStatusMessage(`This quiz is not available yet. It will be available starting ${availableFrom.toLocaleString()}.`);
          return;
        }

        if (availableUntil && now > availableUntil) {
          setQuizStatus('not_available');
          setStatusMessage(`This quiz is no longer available. It was available until ${availableUntil.toLocaleString()}.`);
          return;
        }

        // Check existing attempts using effective attempts_allowed
        const attemptsRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/attempts`);
        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json();
          setExistingAttempts(attemptsData.attempts || []);

          const attemptsAllowed = eff.attempts_allowed;
          if (attemptsData.attempts && attemptsData.attempts.length >= attemptsAllowed) {
            setQuizStatus('no_attempts');
            setStatusMessage(`You have used all ${attemptsAllowed} attempt${attemptsAllowed > 1 ? 's' : ''} for this quiz.`);
            return;
          }
        }
        
        // Fetch questions
        const questionsRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/questions`);
        if (!active) return;
        
        if (!questionsRes.ok) {
          const errorData = await questionsRes.json().catch(() => ({ error: 'Failed to load questions' }));
          throw new Error(errorData.error || 'Failed to load quiz questions');
        }
        
        const qs = await questionsRes.json();
        if (!active) return;
        
        // Check if questions response has error property
        if (qs.error) {
          throw new Error(qs.error);
        }
        
        let list = (qs.questions || []) as Question[];
        if (qz.randomize_questions) list = shuffle(list);
        if (qz.randomize_answers) list = list.map((qq) => ({ ...qq, options: qq.options ? shuffle(qq.options) : qq.options }));
        setQuestions(list);
        
        setQuizStatus('available');
      } catch (error) {
        console.error('Error loading quiz:', error);
        setQuizStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Failed to load quiz. Please try again.');
      }
    })();
    return () => { active = false; };
  }, [quizId]);

  async function startAttempt() {
    if (quizStatus !== 'available') return;
    
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/attempts`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 400 && errorData.error === "No attempts left") {
          setQuizStatus('no_attempts');
          setStatusMessage(`You have used all ${(quiz?.attempts_allowed as number) || 1} attempt${((quiz?.attempts_allowed as number) || 1) > 1 ? 's' : ''} for this quiz.`);
        } else {
          setQuizStatus('error');
          setStatusMessage(errorData.error || 'Failed to start quiz attempt. Please try again.');
        }
        return;
      }
      const data = await res.json();
      setAttemptId(data.id as string);

      // Log quiz start activity
      logQuizStart(quiz?.course_id as string | null, quizId, quiz?.title as string).catch(console.error);
    } catch (error) {
      console.error('Error starting attempt:', error);
      setQuizStatus('error');
      setStatusMessage('Failed to start quiz attempt. Please try again.');
    }
  }

  React.useEffect(() => { 
    if (quizStatus === 'available' && !attemptId) {
      startAttempt(); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizStatus, attemptId]);

  function setAnswerFor(questionId: string, value: unknown) {
    setAnswers((a) => {
      const idx = a.findIndex((x) => x.question_id === questionId);
      if (idx >= 0) {
        const copy = [...a];
        copy[idx] = { question_id: questionId, answer: value };
        return copy;
      }
      return [...a, { question_id: questionId, answer: value }];
    });
  }

  async function saveDraft() {
    if (!attemptId) return;
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      if (!res.ok) {
        console.error('Draft save failed:', res.status);
      }
    } catch (error) {
      console.error('Draft save error:', error);
    }
  }

  async function submit() {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Failed to submit quiz: ${res.status} ${res.statusText}` }));
        setQuizStatus('error');
        setStatusMessage(errorData.error || 'Failed to submit quiz. Please try again.');
        return;
      }
      
      const data = await res.json();

      // Log quiz submission activity
      logQuizSubmit(
        quiz?.course_id as string | null,
        quizId,
        data.score,
        data.total_points,
        quiz?.title as string
      ).catch(console.error);

      window.location.href = `/quiz/${encodeURIComponent(quizId)}/attempt/${encodeURIComponent(attemptId)}/results`;
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setQuizStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const current = questions[index];
  const seconds = Number(effectiveSettings?.time_limit ?? quiz?.time_limit ?? 0) * 60;
  const progress = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0;

  // Check if quiz is proctored (moved before conditional returns for hooks compliance)
  const isProctoredQuiz = Boolean(quiz?.proctored_mode);
  const proctorSettings: ProctorSettings = quiz?.proctor_settings
    ? { ...DEFAULT_PROCTOR_SETTINGS, ...(quiz.proctor_settings as any) }
    : DEFAULT_PROCTOR_SETTINGS;

  // Proctor auto-submit handler (must be before any conditional returns per React hooks rules)
  const handleProctorAutoSubmit = React.useCallback(async () => {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, auto_submitted: true, reason: 'proctor_violation' })
      });
      window.location.href = `/quiz/${encodeURIComponent(quizId)}/attempt/${encodeURIComponent(attemptId)}/results`;
    } catch (error) {
      console.error('Error auto-submitting quiz:', error);
    }
  }, [attemptId, answers, quizId]);

  // Show loading screen
  if (quizStatus === 'loading') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Quiz...</h2>
          <p className="text-gray-600 mt-2">Please wait while we prepare your quiz.</p>
        </div>
      </div>
    );
  }

  // Show error/status screens
  if (quizStatus === 'error' || quizStatus === 'no_attempts' || quizStatus === 'not_available') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
            quizStatus === 'error' ? 'bg-red-100' :
            quizStatus === 'no_attempts' ? 'bg-yellow-100' :
            'bg-gray-100'
          }`}>
            <svg className={`h-6 w-6 ${
              quizStatus === 'error' ? 'text-red-600' :
              quizStatus === 'no_attempts' ? 'text-yellow-600' :
              'text-gray-600'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {quizStatus === 'error' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              ) : quizStatus === 'no_attempts' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </div>
          
          <h2 className={`text-xl font-semibold mb-2 ${
            quizStatus === 'error' ? 'text-red-900' :
            quizStatus === 'no_attempts' ? 'text-yellow-900' :
            'text-gray-900'
          }`}>
            {quizStatus === 'error' ? 'Quiz Error' :
             quizStatus === 'no_attempts' ? 'No Attempts Remaining' :
             'Quiz Not Available'}
          </h2>
          
          <p className="text-gray-600 mb-6">{statusMessage}</p>
          
          {quizStatus === 'no_attempts' && existingAttempts.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Your Previous Attempts:</h3>
              <div className="space-y-2">
                {existingAttempts.map((attempt, idx) => (
                  <div key={attempt.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Attempt {attempt.attempt_number}</span>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        attempt.status === 'graded' ? 'bg-green-100 text-green-800' :
                        attempt.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {attempt.status}
                      </span>
                      {attempt.percentage !== null && (
                        <span className="font-medium">{attempt.percentage}%</span>
                      )}
                      <span className="text-gray-500">
                        {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : 'Incomplete'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show proctor consent screen for proctored quizzes
  if (isProctoredQuiz && !proctorConsent && quiz && quizStatus === 'available') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="bg-white rounded-lg shadow-md border border-orange-200 p-6">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Proctored Quiz</h2>
            <p className="text-gray-600 mt-2">This quiz uses Safe Browser Mode to ensure academic integrity.</p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-orange-900 mb-3">Safe Browser Mode Requirements:</h3>
            <ul className="space-y-2 text-sm text-orange-800">
              {proctorSettings.fullscreen_required && (
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-orange-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span><strong>Fullscreen Mode:</strong> The quiz will run in fullscreen mode</span>
                </li>
              )}
              <li className="flex items-start">
                <svg className="w-5 h-5 text-orange-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span><strong>No Tab Switching:</strong> Switching tabs or windows will be detected</span>
              </li>
              {proctorSettings.block_right_click && (
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-orange-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span><strong>Right-Click Disabled:</strong> Right-click context menu is blocked</span>
                </li>
              )}
              {proctorSettings.block_keyboard_shortcuts && (
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-orange-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  <span><strong>Shortcuts Blocked:</strong> Copy, paste, and other shortcuts are disabled</span>
                </li>
              )}
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span><strong>Violation Limit:</strong> After {proctorSettings.max_violations} violations, your quiz will be automatically submitted</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Before You Start:</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Close all other browser tabs and applications</li>
              <li>• Ensure you have a stable internet connection</li>
              <li>• Make sure you won't be interrupted during the quiz</li>
              <li>• Have all permitted materials ready before starting</li>
            </ul>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showProctorInfo}
                onChange={(e) => setShowProctorInfo(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                I understand that this quiz uses Safe Browser Mode and that violations may result in automatic submission of my quiz. I agree to the proctoring requirements listed above.
              </span>
            </label>
          </div>

          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => setProctorConsent(true)}
              disabled={!showProctorInfo}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I Agree - Continue to Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show instructions screen before starting the quiz
  if (showInstructions && quiz && quizStatus === 'available') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Quiz Header */}
        <div className="text-center space-y-4">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight">{String(quiz.title ?? "Quiz")}</h1>
          {quiz.description && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {String(quiz.description)}
            </p>
          )}
        </div>

        {/* Extension Banner */}
        {effectiveSettings?.has_extension && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-800">You have a quiz extension. Your deadlines and limits may differ from the class defaults.</span>
          </div>
        )}

        {/* Quiz Information Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quiz Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Questions:</span>
                <span className="text-sm text-gray-900">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Points:</span>
                <span className="text-sm text-gray-900">{String(quiz.points || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Attempts Allowed:</span>
                <span className="text-sm text-gray-900">{effectiveSettings?.attempts_allowed ?? String(quiz.attempts_allowed || 1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Attempts Used:</span>
                <span className="text-sm text-gray-900">{existingAttempts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Attempts Remaining:</span>
                <span className="text-sm text-gray-900">{(effectiveSettings?.attempts_allowed ?? (Number(quiz.attempts_allowed) || 1)) - existingAttempts.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {(effectiveSettings?.time_limit ?? quiz.time_limit) ? (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Time Limit:</span>
                  <span className="text-sm text-gray-900">{effectiveSettings?.time_limit ?? String(quiz.time_limit)} minutes</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Question Order:</span>
                <span className="text-sm text-gray-900">{quiz.randomize_questions ? "Randomized" : "Sequential"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Answer Order:</span>
                <span className="text-sm text-gray-900">{quiz.randomize_answers ? "Randomized" : "Sequential"}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          {quiz.instructions && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
              <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-md">
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(quiz.instructions)) }} />
              </div>
            </div>
          )}

          {/* General Instructions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">General Instructions</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                Read each question carefully before answering
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                You can navigate between questions using the Previous/Next buttons
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                Use "Save draft" to save your progress without submitting
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                Once you submit, you cannot change your answers
              </li>
              {quiz.time_limit && (
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  The quiz will auto-submit when time expires
                </li>
              )}
            </ul>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <Button 
              onClick={() => setShowInstructions(false)}
              className="px-4 py-2 text-lg"
            >
              Start Quiz
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz content component (extracted for ProctorProvider wrapping)
  const quizContent = (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Proctored Mode Indicator */}
      {isProctoredQuiz && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm font-medium text-orange-800">Safe Browser Mode Active</span>
          </div>
          <span className="text-xs text-orange-600">Do not switch tabs or windows</span>
        </div>
      )}

      {/* Quiz Header with Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{String(quiz?.title ?? "Quiz")}</h1>
          {seconds > 0 && <Timer seconds={seconds} onExpire={submit} />}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {index + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      {current ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Question Text */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="prose prose-lg max-w-none text-gray-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(current.question_text ?? "")) }} />
                  {current.points && (
                    <p className="text-sm text-gray-500 mt-2">Points: {current.points}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Answer Options */}
            <div className="ml-11">
              {current.type === "multiple_choice" || current.type === "true_false" ? (
                <div className="space-y-3">
                  {(current.options ?? []).map((opt: { id: string; text: string }, optIndex: number) => {
                    // Get current answer for this question
                    const currentAnswer = answers.find((a) => a.question_id === current.id)?.answer;
                    // For multiple_choice and true_false, we use radio buttons (single selection)
                    // Only mark as selected if both opt.id exists AND matches currentAnswer
                    const isSelected = Boolean(opt.id && currentAnswer && currentAnswer === opt.id);

                    return (
                      <label key={opt.id || `opt-${optIndex}`} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name={`q-${current.id}`}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                          checked={isSelected}
                          onChange={() => setAnswerFor(current.id, opt.id)}
                        />
                        <div className="flex-1">
                          <span className="text-gray-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(opt.text)) }} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : current.type === "multiple_select" ? (
                <div className="space-y-3">
                  {(current.options ?? []).map((opt: { id: string; text: string }, optIndex: number) => {
                    // Get current answer for this question
                    const currentAnswer = answers.find((a) => a.question_id === current.id)?.answer;
                    // For multiple_select, we use checkboxes (multi-selection)
                    // Only mark as selected if opt.id exists AND is in the currentAnswer array
                    const isSelected = Boolean(opt.id && Array.isArray(currentAnswer) && currentAnswer.includes(opt.id));

                    return (
                      <label key={opt.id || `opt-${optIndex}`} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          name={`q-${current.id}-${opt.id || optIndex}`}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                          checked={isSelected}
                          onChange={(e) => {
                            const prev = (answers.find((a) => a.question_id === current.id)?.answer as string[] | undefined) ?? [];
                            if (e.target.checked) setAnswerFor(current.id, [...prev, opt.id]);
                            else setAnswerFor(current.id, prev.filter((x) => x !== opt.id));
                          }}
                        />
                        <div className="flex-1">
                          <span className="text-gray-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(opt.text)) }} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : current.type === "short_answer" ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Your Answer:</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Type your answer here..."
                    value={(answers.find((a) => a.question_id === current.id)?.answer as string) || ''}
                    onChange={(e) => setAnswerFor(current.id, e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Your Response:</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={6}
                    placeholder="Type your response here..."
                    value={(answers.find((a) => a.question_id === current.id)?.answer as string) || ''}
                    onChange={(e) => setAnswerFor(current.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="px-4 py-2"
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                disabled={index >= questions.length - 1}
                className="px-4 py-2"
              >
                Next →
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={saveDraft}
                className="px-4 py-2"
              >
                Save Draft
              </Button>
              <Button
                onClick={submit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg">Loading quiz...</p>
          </div>
        </div>
      )}
    </div>
  );

  // Wrap with ProctorProvider if proctored mode is enabled
  if (isProctoredQuiz && attemptId) {
    return (
      <ProctorProvider
        quizId={quizId}
        attemptId={attemptId}
        settings={proctorSettings}
        onAutoSubmit={handleProctorAutoSubmit}
        enabled={true}
      >
        <ProctorStartTrigger />
        {quizContent}
      </ProctorProvider>
    );
  }

  return quizContent;
}

// Helper component to trigger proctor start
function ProctorStartTrigger() {
  const { startProctoring } = useProctor();

  React.useEffect(() => {
    startProctoring();
  }, [startProctoring]);

  return null;
}
