'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import QuizStatusButton from '@/app/components/quiz/QuizStatusButton';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';
import { sanitizeHtml } from '@/lib/sanitize';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

// Shape of the fields this block reads from the quiz record.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QuizRecord = any;

export interface QuizBlockProps {
  index: number;
  /** Optional header title. If absent, the header bar is not shown. */
  title?: string;
  /** Quiz id (required to render anything other than the empty state). */
  quizId?: string;
  /** The fetched quiz record. Undefined while loading or when missing. */
  quiz?: QuizRecord;
  /** True while the quiz record is loading. */
  isLoading: boolean;
  /** Show instructor-only edit/delete buttons when true. */
  isInstructor: boolean;
  /** When this matches `quizId`, the Delete button shows its busy state. */
  deletingId: string | null;
  /** Called by the Delete button. */
  onDelete: (quizId: string) => void;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible quiz card. Shows a brief description, point value, question
 * count, and time limit (all pulled from the fetched quiz record), plus
 * a QuizStatusButton that routes the user to the attempt flow. Instructors
 * also see Edit and Delete buttons.
 *
 * When `quizId` is missing, the block renders an instructor-facing
 * "Quiz not configured yet" placeholder. The orphan ("Quiz Not Found")
 * state is handled by the parent via OrphanContentCard, not here.
 */
export default function QuizBlock({
  index,
  title,
  quizId,
  quiz,
  isLoading,
  isInstructor,
  deletingId,
  onDelete,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: QuizBlockProps) {
  // Suppress unused-prop warning — `index` is reserved for future bookmark
  // metadata symmetry with other blocks, even though it's not rendered here.
  void index;

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
      {title && (
        <div
          className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
                Quiz
              </span>
              <span className="truncate">{title}</span>
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ContentProgressCheckbox isComplete={isComplete} onToggle={onToggleComplete} />
              <div className="p-1 rounded hover:bg-white/10 transition-colors">
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-white/50" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-white/50" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        <div className="p-4 sm:p-6">
          {quizId ? (
            <div
              className="border border-gray-100 rounded-md overflow-hidden"
              style={{ willChange: 'auto' }}
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                  <div className="flex-1 min-w-0 w-full min-h-[60px]">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-slate-800 text-sm sm:text-base">Quiz</h4>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded uppercase tracking-wider">
                        Assessment
                      </span>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 pb-2">
                        <LoadingIndicator variant="dots" size="xs" text="Loading quiz details..." />
                      </div>
                    ) : quiz ? (
                      <div className="space-y-3">
                        <div
                          className="text-sm sm:text-base text-gray-700 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(
                              quiz.description || 'Test your knowledge and understanding'
                            ),
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{quiz.points || 100} pts</span>
                          <span className="text-slate-200">|</span>
                          <span>{quiz.questions?.length || 0} questions</span>
                          {quiz.time_limit && (
                            <>
                              <span className="text-slate-200">|</span>
                              <span>{quiz.time_limit} min</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-600">
                        Test your knowledge and understanding
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 w-full sm:w-auto min-h-[40px]">
                  {quiz ? (
                    <QuizStatusButton quiz={quiz} quizId={quizId} />
                  ) : (
                    <div className="px-4 py-2 bg-gray-200 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed self-start">
                      Loading...
                    </div>
                  )}
                  {isInstructor && (
                    <>
                      <Link
                        href={`/quizzes/${quizId}/edit`}
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                        title="Edit Quiz"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span className="hidden sm:inline">Edit Quiz</span>
                        <span className="sm:hidden">Edit</span>
                      </Link>
                      <button
                        onClick={() => onDelete(quizId)}
                        disabled={deletingId === quizId}
                        className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        title="Delete Quiz"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        {deletingId === quizId ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-lg font-medium">Quiz not configured yet</p>
              <p className="text-sm">Create a quiz to test your students</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
