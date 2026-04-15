'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import { STAFF_ROLES } from './helpers';
import type { SurveyData } from './types';

interface CourseEvaluationsProps {
  courseId: string;
  surveys: SurveyData[];
  userRole: string | null;
  isEnrolled: boolean;
  readOnly?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function CourseEvaluations({
  courseId,
  surveys,
  userRole,
  isEnrolled,
  readOnly = false,
  collapsible = false,
  defaultOpen = true,
}: CourseEvaluationsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasSurveys = surveys.length > 0;

  if (!hasSurveys && readOnly) return null;

  if (!hasSurveys && !readOnly) {
    return (
      <RoleGuard roles={[...STAFF_ROLES]}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div
            className={`px-4 sm:px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
            onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-display text-gray-900 border-l-[3px] pl-3" style={{ borderColor: 'var(--theme-accent, #0D9488)' }}>
                Course Evaluations
              </h2>
              {collapsible && (
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          {(!collapsible || isOpen) && (
            <div className="p-3 sm:p-4">
              <div className="text-center py-4">
                <Icon icon="material-symbols:poll" className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">No course evaluations yet</p>
                <Link
                  href={`/surveys/create?course_id=${courseId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Icon icon="material-symbols:add" className="w-4 h-4" />
                  Create Evaluation
                </Link>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div
        className={`px-4 sm:px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-display text-gray-900 border-l-[3px] pl-3" style={{ borderColor: 'var(--theme-accent, #0D9488)' }}>
            Course Evaluations
          </h2>
          <div className="flex items-center gap-2">
            {!readOnly && !collapsible && (
              <RoleGuard roles={[...STAFF_ROLES]}>
                <Link href={`/surveys/create?course_id=${courseId}`} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                  <Icon icon="material-symbols:add" className="w-3.5 h-3.5" />Add
                </Link>
              </RoleGuard>
            )}
            {collapsible && (
              <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {(!collapsible || isOpen) && (
        <div className="p-3 sm:p-4">
          <div className="space-y-2">
            {surveys.map((survey) => (
              <div key={survey.id} className="flex items-center gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-teal-50/50 to-cyan-50/50 rounded-lg border border-teal-100 hover:border-teal-200 transition-colors">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon icon="material-symbols:poll" className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">{survey.title}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {survey.is_anonymous && <span className="flex items-center gap-1"><Icon icon="material-symbols:visibility-off" className="w-3 h-3" />Anonymous</span>}
                    {survey.response_count !== undefined && <span className="flex items-center gap-1"><Icon icon="material-symbols:group" className="w-3 h-3" />{survey.response_count} responses</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {survey.has_responded && !survey.can_respond ? (
                    <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg">Done</span>
                  ) : isEnrolled ? (
                    <Link href={`/surveys/${survey.id}/take`} className="px-2.5 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">Take</Link>
                  ) : null}
                  {!readOnly && (
                    <RoleGuard roles={[...STAFF_ROLES]}>
                      <Link href={`/surveys/${survey.id}/results`} className="px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors">Results</Link>
                    </RoleGuard>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
