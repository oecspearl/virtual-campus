'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import { stripHtml } from '@/lib/utils';
import { isStaffRole, STAFF_ROLES } from './helpers';
import type { QuizData, AssignmentData, DiscussionData } from './types';

interface CourseAssessmentsProps {
  courseId: string;
  quizzes: QuizData[];
  assignments: AssignmentData[];
  discussions: DiscussionData[];
  userRole: string | null;
  isEnrolled: boolean;
  readOnly?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function CourseAssessments({
  courseId,
  quizzes,
  assignments,
  discussions,
  userRole,
  isEnrolled,
  readOnly = false,
  collapsible = false,
  defaultOpen = true,
}: CourseAssessmentsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const totalCount = quizzes.length + assignments.length + discussions.length;
  const isStaff = isStaffRole(userRole);

  const visibleAssignments = assignments.filter(
    (a) => a.published || (isStaff && !readOnly)
  );

  const hasAssessments = quizzes.length > 0 || visibleAssignments.length > 0 || discussions.length > 0;

  if (!hasAssessments && readOnly) return null;

  if (!hasAssessments && !readOnly) {
    return (
      <RoleGuard roles={[...STAFF_ROLES]}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div
            className={`px-4 sm:px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
            onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-display text-gray-900 border-l-[3px] pl-3" style={{ borderColor: 'var(--theme-accent, #F59E0B)' }}>
                Course Assessments
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
                <Icon icon="material-symbols:assignment" className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">No course assessments yet</p>
                <div className="flex items-center justify-center gap-2">
                  <Link
                    href={`/quizzes/create?course_id=${courseId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Icon icon="material-symbols:quiz" className="w-4 h-4" />
                    Create Quiz
                  </Link>
                  <Link
                    href={`/assignments/create?course_id=${courseId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Icon icon="material-symbols:edit-document" className="w-4 h-4" />
                    Create Assignment
                  </Link>
                </div>
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
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="material-symbols:assignment" className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Assessments
              <span className="ml-2 text-sm font-normal text-gray-500">({totalCount})</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && !collapsible && (
              <RoleGuard roles={[...STAFF_ROLES]}>
                <div className="flex items-center gap-2">
                  <Link href={`/quizzes/create?course_id=${courseId}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <Icon icon="material-symbols:add" className="w-3.5 h-3.5" />Quiz
                  </Link>
                  <Link href={`/assignments/create?course_id=${courseId}`} className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                    <Icon icon="material-symbols:add" className="w-3.5 h-3.5" />Assignment
                  </Link>
                </div>
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
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="flex items-center gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon icon="material-symbols:quiz" className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">Quiz</span>
                    <div className="font-medium text-sm text-gray-900 truncate">{quiz.title}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {quiz.time_limit && <span className="flex items-center gap-1"><Icon icon="material-symbols:timer" className="w-3 h-3" />{quiz.time_limit}m</span>}
                    {quiz.passing_score && <span className="flex items-center gap-1"><Icon icon="material-symbols:target" className="w-3 h-3" />{quiz.passing_score}%</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href={`/quiz/${quiz.id}/attempt`} className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Take</Link>
                  {!readOnly && (
                    <RoleGuard roles={[...STAFF_ROLES]}>
                      <Link href={`/grade/quiz/${quiz.id}`} className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors">Results</Link>
                    </RoleGuard>
                  )}
                </div>
              </div>
            ))}

            {visibleAssignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-lg border border-green-100 hover:border-green-200 transition-colors">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon icon="material-symbols:edit-document" className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Assignment</span>
                    {!assignment.published && <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Draft</span>}
                    <div className="font-medium text-sm text-gray-900 truncate">{assignment.title}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {assignment.due_date && <span className="flex items-center gap-1"><Icon icon="material-symbols:calendar-today" className="w-3 h-3" />{new Date(assignment.due_date).toLocaleDateString()}</span>}
                    {assignment.points && <span className="flex items-center gap-1"><Icon icon="material-symbols:star" className="w-3 h-3" />{assignment.points}pts</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href={`/assignment/${assignment.id}`} className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">View</Link>
                  {!readOnly && (
                    <RoleGuard roles={[...STAFF_ROLES]}>
                      <Link href={`/grade/assignment/${assignment.id}`} className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors">Grade</Link>
                    </RoleGuard>
                  )}
                </div>
              </div>
            ))}

            {discussions.map((discussion) => (
              <div key={discussion.id} className="flex items-center gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-purple-50/50 to-violet-50/50 rounded-lg border border-purple-100 hover:border-purple-200 transition-colors">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon icon="material-symbols:forum" className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Discussion</span>
                    <div className="font-medium text-sm text-gray-900 truncate">{discussion.title}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {discussion.points && <span className="flex items-center gap-1"><Icon icon="material-symbols:star" className="w-3 h-3" />{discussion.points}pts</span>}
                    {discussion.due_date && <span className="flex items-center gap-1"><Icon icon="material-symbols:calendar-today" className="w-3 h-3" />{new Date(discussion.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href={`/course/${courseId}/discussions/${discussion.id}`} className="px-2.5 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">Join</Link>
                  {!readOnly && (
                    <RoleGuard roles={[...STAFF_ROLES]}>
                      <Link href={`/course/${courseId}/discussions/${discussion.id}?grade=true`} className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors">Grade</Link>
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
