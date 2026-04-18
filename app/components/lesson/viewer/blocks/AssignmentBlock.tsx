'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';
import { sanitizeHtml } from '@/lib/sanitize';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

// Shape of the fields this block reads from the assignment record.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AssignmentRecord = any;

export interface AssignmentBlockProps {
  index: number;
  /** Header title. Defaults to "Assignment". */
  title?: string;
  /** Assignment id — without it the block shows the "not configured yet" empty state. */
  assignmentId?: string;
  /** The fetched assignment record. Undefined while loading or when missing. */
  assignment?: AssignmentRecord;
  /** True while the assignment record is loading. */
  isLoading: boolean;
  /** Show instructor-only edit/delete buttons when true. */
  isInstructor: boolean;
  /** When this matches `assignmentId`, the Delete button shows its busy state. */
  deletingId: string | null;
  /** Called by the Delete button. */
  onDelete: (assignmentId: string) => void;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible assignment card. Shows points, due date, and submission
 * types pulled from the fetched assignment record, plus a "View
 * Assignment" link and instructor edit/delete actions.
 *
 * As with QuizBlock, the orphan ("Assignment Not Found") state is owned
 * by the parent via OrphanContentCard.
 */
export default function AssignmentBlock({
  index,
  title,
  assignmentId,
  assignment,
  isLoading,
  isInstructor,
  deletingId,
  onDelete,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: AssignmentBlockProps) {
  void index; // reserved for future bookmark metadata symmetry

  const displayTitle = title || 'Assignment';

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
      <div
        className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
              Assignment
            </span>
            <span className="truncate">{displayTitle}</span>
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
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        <div className="p-4 sm:p-6">
          {assignmentId ? (
            <div
              className="border border-gray-100 rounded-md overflow-hidden"
              style={{ willChange: 'auto' }}
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                  <div className="flex-1 min-w-0 w-full min-h-[60px]">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-slate-800 text-sm sm:text-base">
                        Assignment
                      </h4>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded uppercase tracking-wider">
                        Submission
                      </span>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 pb-2">
                        <LoadingIndicator variant="dots" size="xs" text="Loading assignment details..." />
                      </div>
                    ) : assignment ? (
                      <div className="space-y-3">
                        <div
                          className="text-sm sm:text-base text-gray-700 leading-relaxed line-clamp-2 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(
                              assignment.description || 'Complete this assignment'
                            ),
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{assignment.points || 100} pts</span>
                          {assignment.due_date && (
                            <>
                              <span className="text-slate-200">|</span>
                              <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                            </>
                          )}
                          <span className="text-slate-200">|</span>
                          <span>
                            {assignment.submission_types?.join(', ') || 'File'} submission
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-600">Complete this assignment</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 w-full sm:w-auto min-h-[40px]">
                  <Link
                    href={`/assignment/${assignmentId}`}
                    className="inline-flex items-center justify-center px-4 py-2 border border-teal-600 text-teal-700 hover:bg-teal-50 rounded-md text-sm transition-colors self-start"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View Assignment
                  </Link>
                  {isInstructor && (
                    <>
                      <Link
                        href={`/assignments/${assignmentId}/edit`}
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                        title="Edit Assignment"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span className="hidden sm:inline">Edit Assignment</span>
                        <span className="sm:hidden">Edit</span>
                      </Link>
                      <button
                        onClick={() => onDelete(assignmentId)}
                        disabled={deletingId === assignmentId}
                        className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        title="Delete Assignment"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        {deletingId === assignmentId ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
              Assignment not configured yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
