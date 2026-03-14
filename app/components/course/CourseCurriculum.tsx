'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import CourseFormatRenderer from '@/app/components/CourseFormatRenderer';
import CourseFormatSelector, { type CourseFormat } from '@/app/components/CourseFormatSelector';
import SectionManager, { type Section } from '@/app/components/SectionManager';
import RoleGuard from '@/app/components/RoleGuard';
import type { LessonProgressData } from './types';

interface CourseCurriculumProps {
  courseId: string;
  lessons: any[];
  sections: Section[];
  courseFormat: CourseFormat;
  lessonProgress: LessonProgressData[];
  /** Editable mode (regular course page for instructors) */
  editMode?: boolean;
  isReorderMode?: boolean;
  formatSaving?: boolean;
  showSectionManager?: boolean;
  courseStartDate?: string | null;
  onFormatChange?: (format: CourseFormat) => void;
  onToggleReorderMode?: () => void;
  onReorder?: (lessons: any[]) => void;
  onAssignSection?: (lessonId: string, sectionId: string | null) => void;
  onSectionsChange?: (sections: Section[]) => void;
  onToggleSectionManager?: () => void;
  onStartDateChange?: (date: string) => void;
  /** Read-only mode for shared courses */
  readOnly?: boolean;
}

export default function CourseCurriculum({
  courseId,
  lessons,
  sections,
  courseFormat,
  lessonProgress,
  editMode = false,
  isReorderMode = false,
  formatSaving = false,
  showSectionManager = false,
  courseStartDate,
  onFormatChange,
  onToggleReorderMode,
  onReorder,
  onAssignSection,
  onSectionsChange,
  onToggleSectionManager,
  onStartDateChange,
  readOnly = false,
}: CourseCurriculumProps) {
  const formatLabel = courseFormat === 'weekly' ? 'Weekly schedule' :
    courseFormat === 'topics' ? 'Organized by topics' :
    courseFormat === 'grid' ? 'Activity grid' :
    'Structured learning path';

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Curriculum</h2>
                <p className="text-sm sm:text-base text-gray-600">{formatLabel} with {lessons.length} lessons</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!readOnly && onFormatChange && (
                <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                  <CourseFormatSelector
                    currentFormat={courseFormat}
                    onFormatChange={onFormatChange}
                    saving={formatSaving}
                  />
                </RoleGuard>
              )}
              <div className="text-center sm:text-right">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">{lessons.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Lessons</div>
              </div>
            </div>
          </div>

          {/* Section Manager — visible for topics/weekly when editing */}
          {!readOnly && (courseFormat === 'topics' || courseFormat === 'weekly') && onSectionsChange && (
            <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
              <div className="border-t border-green-100 pt-3">
                <button
                  onClick={onToggleSectionManager}
                  className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 transition-colors mb-2"
                >
                  <Icon icon={showSectionManager ? 'material-symbols:expand-less' : 'material-symbols:settings'} className="w-4 h-4" />
                  {showSectionManager ? 'Hide' : 'Manage'} {courseFormat === 'weekly' ? 'Weeks' : 'Sections'}
                </button>
                {showSectionManager && (
                  <>
                    {courseFormat === 'weekly' && onStartDateChange && (
                      <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Icon icon="material-symbols:calendar-month" className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <label htmlFor="course-start-date" className="text-sm font-medium text-blue-900 block">
                            Course Start Date
                          </label>
                          <p className="text-xs text-blue-600">Week dates are calculated from this date</p>
                        </div>
                        <input
                          id="course-start-date"
                          type="date"
                          value={courseStartDate || ''}
                          onChange={(e) => onStartDateChange(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                    )}
                    <SectionManager
                      courseId={courseId}
                      sections={sections}
                      onSectionsChange={onSectionsChange}
                      isWeekly={courseFormat === 'weekly'}
                      courseStartDate={courseStartDate}
                    />
                  </>
                )}
              </div>
            </RoleGuard>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-6 lg:p-8">
        <CourseFormatRenderer
          courseId={courseId}
          lessons={lessons}
          sections={sections}
          format={courseFormat}
          isReorderMode={readOnly ? false : isReorderMode}
          onToggleReorderMode={readOnly ? () => {} : (onToggleReorderMode || (() => {}))}
          onReorder={readOnly ? () => {} : (onReorder || (() => {}))}
          editMode={readOnly ? false : editMode}
          onAssignSection={readOnly ? undefined : onAssignSection}
          lessonProgress={lessonProgress}
        />
      </div>
    </div>
  );
}
