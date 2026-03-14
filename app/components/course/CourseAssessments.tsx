'use client';

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
  /** If true, don't show create/grade buttons (for shared courses) */
  readOnly?: boolean;
}

export default function CourseAssessments({
  courseId,
  quizzes,
  assignments,
  discussions,
  userRole,
  isEnrolled,
  readOnly = false,
}: CourseAssessmentsProps) {
  const totalCount = quizzes.length + assignments.length + discussions.length;
  const isStaff = isStaffRole(userRole);

  // Filter assignments: show unpublished only for staff in non-readOnly mode
  const visibleAssignments = assignments.filter(
    (a) => a.published || (isStaff && !readOnly)
  );

  const hasAssessments = quizzes.length > 0 || visibleAssignments.length > 0 || discussions.length > 0;

  // Return null if no assessments and readOnly
  if (!hasAssessments && readOnly) {
    return null;
  }

  // Empty state for non-readOnly (shows create buttons for staff)
  if (!hasAssessments && !readOnly) {
    return (
      <RoleGuard roles={[...STAFF_ROLES]}>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="material-symbols:assignment" className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Assessments</h2>
                <p className="text-xs sm:text-sm text-gray-600">Add quizzes and assignments</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-center py-6">
              <Icon icon="material-symbols:assignment" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">No course assessments yet</p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href={`/quizzes/create?course_id=${courseId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Icon icon="material-symbols:quiz" className="w-5 h-5" />
                  Create Quiz
                </Link>
                <Link
                  href={`/assignments/create?course_id=${courseId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Icon icon="material-symbols:edit-document" className="w-5 h-5" />
                  Create Assignment
                </Link>
              </div>
            </div>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon icon="material-symbols:assignment" className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Assessments</h2>
              <p className="text-xs sm:text-sm text-gray-600">Quizzes, assignments, and graded discussions</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!readOnly && (
              <RoleGuard roles={[...STAFF_ROLES]}>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/quizzes/create?course_id=${courseId}`}
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Icon icon="material-symbols:add" className="w-4 h-4" />
                    Quiz
                  </Link>
                  <Link
                    href={`/assignments/create?course_id=${courseId}`}
                    className="text-xs sm:text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                  >
                    <Icon icon="material-symbols:add" className="w-4 h-4" />
                    Assignment
                  </Link>
                </div>
              </RoleGuard>
            )}
            <div className="text-center sm:text-right">
              <div className="text-2xl sm:text-3xl font-bold text-amber-600">{totalCount}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment rows */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-3">
          {/* Quizzes */}
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="material-symbols:quiz" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Quiz</span>
                  <div className="font-semibold text-sm sm:text-base text-gray-900">{quiz.title}</div>
                </div>
                {quiz.description && (
                  <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{quiz.description}</div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {quiz.time_limit && (
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:timer" className="w-3 h-3" />
                      {quiz.time_limit} min
                    </span>
                  )}
                  {quiz.passing_score && (
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:target" className="w-3 h-3" />
                      Pass: {quiz.passing_score}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/quiz/${quiz.id}/attempt`}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Take Quiz
                </Link>
                {!readOnly && (
                  <RoleGuard roles={[...STAFF_ROLES]}>
                    <Link
                      href={`/grade/quiz/${quiz.id}`}
                      className="px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                    >
                      Results
                    </Link>
                  </RoleGuard>
                )}
              </div>
            </div>
          ))}

          {/* Assignments */}
          {visibleAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg sm:rounded-xl border border-green-200 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="material-symbols:edit-document" className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">Assignment</span>
                  {!assignment.published && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Draft</span>
                  )}
                  <div className="font-semibold text-sm sm:text-base text-gray-900">{assignment.title}</div>
                </div>
                {assignment.description && (
                  <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{stripHtml(assignment.description)}</div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {assignment.due_date && (
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {assignment.points && (
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:star" className="w-3 h-3" />
                      {assignment.points} points
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/assignment/${assignment.id}`}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  View
                </Link>
                {!readOnly && (
                  <RoleGuard roles={[...STAFF_ROLES]}>
                    <Link
                      href={`/grade/assignment/${assignment.id}`}
                      className="px-3 py-1.5 text-xs sm:text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                    >
                      Grade
                    </Link>
                  </RoleGuard>
                )}
              </div>
            </div>
          ))}

          {/* Graded Discussions */}
          {discussions.map((discussion) => (
            <div
              key={discussion.id}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg sm:rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="material-symbols:forum" className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Discussion</span>
                  <div className="font-semibold text-sm sm:text-base text-gray-900">{discussion.title}</div>
                </div>
                {discussion.content && (
                  <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                    {stripHtml(discussion.content).substring(0, 100)}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {discussion.points && (
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:star" className="w-3 h-3" />
                      {discussion.points} points
                    </span>
                  )}
                  {discussion.due_date && (
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                      Due: {new Date(discussion.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {discussion.min_replies && discussion.min_replies > 0 && (
                    <span className="flex items-center gap-1">
                      <Icon icon="material-symbols:reply" className="w-3 h-3" />
                      Min {discussion.min_replies} replies
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/course/${courseId}/discussions/${discussion.id}`}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Participate
                </Link>
                {!readOnly && (
                  <RoleGuard roles={[...STAFF_ROLES]}>
                    <Link
                      href={`/course/${courseId}/discussions/${discussion.id}?grade=true`}
                      className="px-3 py-1.5 text-xs sm:text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                    >
                      Grade
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
