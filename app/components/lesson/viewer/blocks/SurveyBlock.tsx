'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

export interface SurveyBlockProps {
  index: number;
  lessonId: string;
  /** Header title. Defaults to "Survey". */
  title?: string;
  /** Survey id — without it the block shows an instructor-facing setup prompt. */
  surveyId?: string;
  /** Optional description shown above the action buttons. */
  description?: string;
  /** When true, shows "View Results" and "Edit Survey" alongside "Take Survey". */
  isInstructor: boolean;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible survey content block. Links to the survey's take/results/edit
 * pages on the surveys routes (/surveys/:id/take, etc.). The block itself
 * never fetches survey data — it's a pure link panel.
 */
export default function SurveyBlock({
  index,
  lessonId,
  title,
  surveyId,
  description,
  isInstructor,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: SurveyBlockProps) {
  const displayTitle = title || 'Survey';

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
      <div
        className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
              Survey
            </span>
            <span className="truncate">{displayTitle}</span>
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ContentProgressCheckbox isComplete={isComplete} onToggle={onToggleComplete} />
            <BookmarkButton
              type="lesson_content"
              id={lessonId}
              size="sm"
              className="text-white/50 hover:text-white/80"
              metadata={{ content_type: 'survey', content_title: title, content_index: index }}
            />
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
          {surveyId ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                {description || 'Please complete this survey to provide feedback.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/surveys/${surveyId}/take`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-teal-600 text-teal-700 hover:bg-teal-50 rounded-md text-sm transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  Take Survey
                </Link>
                {isInstructor && (
                  <>
                    <Link
                      href={`/surveys/${surveyId}/results`}
                      className="inline-flex items-center justify-center px-6 py-3 border border-teal-600 text-teal-700 hover:bg-teal-50 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      View Results
                    </Link>
                    <Link
                      href={`/surveys/${surveyId}/edit`}
                      className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Survey
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <p className="text-lg font-medium">Survey not configured</p>
              <p className="text-sm">Add a survey ID to enable this content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
