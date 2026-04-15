'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import type { InstructorData } from './types';
import CourseInstructorManager from '@/app/components/course/CourseInstructorManager';

interface CourseTeamProps {
  courseId: string;
  instructors?: InstructorData[];
  userRole: string | null;
  editable?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

function CourseTeamInner({
  courseId,
  instructors,
  userRole,
  editable = false,
  collapsible = false,
  defaultOpen = true,
}: CourseTeamProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div
        className={`px-4 sm:px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-display text-gray-900 border-l-[3px] pl-3" style={{ borderColor: 'var(--theme-accent, #14B8A6)' }}>
            Course Team
          </h2>
          {collapsible && (
            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {(!collapsible || isOpen) && (
        <div className="p-3 sm:p-4 lg:p-5">
          {editable ? (
            <CourseInstructorManager courseId={courseId} isAdmin={userRole === 'admin' || userRole === 'super_admin' || userRole === 'curriculum_designer'} />
          ) : (
            <>
              {instructors && instructors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {instructors.map((instructor) => (
                    <div key={instructor.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-teal-700 font-semibold text-xs">
                          {instructor.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{instructor.name}</p>
                        <p className="text-xs text-gray-500 truncate">{instructor.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-3">No instructors assigned to this course yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const CourseTeam = React.memo(CourseTeamInner);
export default CourseTeam;
