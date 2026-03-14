'use client';

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
  /** If true, don't show create/results buttons (for shared courses) */
  readOnly?: boolean;
}

export default function CourseEvaluations({
  courseId,
  surveys,
  userRole,
  isEnrolled,
  readOnly = false,
}: CourseEvaluationsProps) {
  const hasSurveys = surveys.length > 0;

  // Return null if no surveys and readOnly
  if (!hasSurveys && readOnly) {
    return null;
  }

  // Empty state for non-readOnly (shows create button for staff)
  if (!hasSurveys && !readOnly) {
    return (
      <RoleGuard roles={[...STAFF_ROLES]}>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="material-symbols:poll" className="w-4 h-4 sm:w-6 sm:h-6 text-teal-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Evaluations</h2>
                <p className="text-xs sm:text-sm text-gray-600">Collect feedback from students</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-center py-6">
              <Icon icon="material-symbols:poll" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">No course evaluations yet</p>
              <Link
                href={`/surveys/create?course_id=${courseId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                <Icon icon="material-symbols:add" className="w-5 h-5" />
                Create Course Evaluation
              </Link>
            </div>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon icon="material-symbols:poll" className="w-4 h-4 sm:w-6 sm:h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Evaluations</h2>
              <p className="text-xs sm:text-sm text-gray-600">Share your feedback about this course</p>
            </div>
          </div>
          {!readOnly && (
            <RoleGuard roles={[...STAFF_ROLES]}>
              <Link
                href={`/surveys/create?course_id=${courseId}`}
                className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                <Icon icon="material-symbols:add" className="w-4 h-4" />
                Add Survey
              </Link>
            </RoleGuard>
          )}
        </div>
      </div>

      {/* Survey rows */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-3">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg sm:rounded-xl border border-teal-200 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="material-symbols:poll" className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base text-gray-900">{survey.title}</div>
                {survey.description && (
                  <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{survey.description}</div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
              <div className="flex items-center gap-2">
                {survey.has_responded && !survey.can_respond ? (
                  <span className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg">
                    Completed
                  </span>
                ) : isEnrolled ? (
                  <Link
                    href={`/surveys/${survey.id}/take`}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                  >
                    Take Survey
                  </Link>
                ) : null}
                {!readOnly && (
                  <RoleGuard roles={[...STAFF_ROLES]}>
                    <Link
                      href={`/surveys/${survey.id}/results`}
                      className="px-3 py-1.5 text-xs sm:text-sm font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors"
                    >
                      Results
                    </Link>
                  </RoleGuard>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
