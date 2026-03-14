'use client';

import { Icon } from '@iconify/react';
import type { InstructorData } from './types';
import CourseInstructorManager from '@/app/components/CourseInstructorManager';

interface CourseTeamProps {
  courseId: string;
  instructors?: InstructorData[];
  userRole: string | null;
  /** If true, use CourseInstructorManager (editable). If false, show simple read-only grid */
  editable?: boolean;
}

export default function CourseTeam({
  courseId,
  instructors,
  userRole,
  editable = false,
}: CourseTeamProps) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Teal gradient header */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center">
            <Icon icon="material-symbols:group" className="w-4 h-4 sm:w-6 sm:h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Team</h2>
            <p className="text-sm sm:text-base text-gray-600">Meet your instructors and facilitators</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {editable ? (
          <CourseInstructorManager courseId={courseId} isAdmin={userRole === 'admin' || userRole === 'super_admin' || userRole === 'curriculum_designer'} />
        ) : (
          <>
            {instructors && instructors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {instructors.map((instructor) => (
                  <div
                    key={instructor.id}
                    className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    {/* Avatar circle */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-700 font-semibold text-sm sm:text-base">
                        {instructor.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {instructor.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {instructor.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No instructors assigned to this course yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
