'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import CourseFormatRenderer from '@/app/components/course/CourseFormatRenderer';
import CourseFormatSelector, { type CourseFormat } from '@/app/components/course/CourseFormatSelector';
import SectionManager, { type Section } from '@/app/components/course/SectionManager';
import RoleGuard from '@/app/components/RoleGuard';
import type { LessonProgressData } from './types';

interface CourseCurriculumProps {
  courseId: string;
  lessons: any[];
  sections: Section[];
  courseFormat: CourseFormat;
  lessonProgress: LessonProgressData[];
  editMode?: boolean;
  isReorderMode?: boolean;
  formatSaving?: boolean;
  showSectionManager?: boolean;
  courseStartDate?: string | null;
  onFormatChange?: (format: CourseFormat) => void;
  onToggleReorderMode?: () => void;
  onReorder?: (lessons: any[]) => void;
  onAssignSection?: (lessonId: string, sectionId: string | null) => void;
  /** Reorder lessons within a section/week. sectionId === null = unassigned bucket. */
  onReorderLessons?: (sectionId: string | null, lessonIds: string[]) => void;
  /** Reorder the sections (topics or weeks) themselves. */
  onReorderSections?: (sectionIds: string[]) => void;
  onSectionsChange?: (sections: Section[]) => void;
  onToggleSectionManager?: () => void;
  onStartDateChange?: (date: string) => void;
  readOnly?: boolean;
  onLessonClick?: (lessonId: string) => void;
}

// Lesson type color dots for the legend
const LESSON_TYPES = [
  { key: 'rich_text', label: 'Page', color: '#3B82F6' },
  { key: 'video', label: 'Video', color: '#8B5CF6' },
  { key: 'scorm', label: 'Interactive', color: '#0D9488' },
  { key: 'quiz', label: 'Quiz', color: '#F59E0B' },
  { key: 'assignment', label: 'Assignment', color: '#10B981' },
  { key: 'audio', label: 'Audio', color: '#EC4899' },
];

// View mode pills
const VIEW_MODES: { key: CourseFormat; label: string }[] = [
  { key: 'lessons', label: 'Sequential' },
  { key: 'topics', label: 'Topic' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'grid', label: 'Activity' },
];

function CourseCurriculumInner({
  courseId, lessons, sections, courseFormat, lessonProgress,
  editMode = false, isReorderMode = false, formatSaving = false,
  showSectionManager = false, courseStartDate,
  onFormatChange, onToggleReorderMode, onReorder, onAssignSection,
  onReorderLessons, onReorderSections,
  onSectionsChange, onToggleSectionManager, onStartDateChange,
  readOnly = false, onLessonClick,
}: CourseCurriculumProps) {
  const completedCount = lessonProgress.filter(lp => lp.status === 'completed').length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Count lesson types for legend
  const typeCounts: Record<string, number> = {};
  lessons.forEach(l => {
    const t = l.content_type || 'rich_text';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const visibleTypes = LESSON_TYPES.filter(lt => typeCounts[lt.key]);

  return (
    <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Course curriculum</h2>
            <span className="text-sm text-gray-400">
              {lessons.length} lessons
            </span>
            {completedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                {completedCount}/{lessons.length} done
              </span>
            )}
          </div>

          {/* Progress micro-bar */}
          {completedCount > 0 && (
            <div className="flex items-center gap-2 sm:w-32">
              <div className="flex-1 h-1 rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">{progressPct}%</span>
            </div>
          )}
        </div>

        {/* View mode pills + legend */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
          {/* Format pills (instructor) or static label (student) */}
          {!readOnly && onFormatChange ? (
            <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}
              fallback={
                <div className="text-xs text-gray-400">
                  {courseFormat === 'weekly' ? 'Weekly' : courseFormat === 'topics' ? 'Topics' : courseFormat === 'grid' ? 'Activity' : 'Sequential'} view
                </div>
              }
            >
              <div className="flex gap-1.5 flex-wrap">
                {VIEW_MODES.map(mode => (
                  <button
                    key={mode.key}
                    onClick={() => onFormatChange(mode.key)}
                    disabled={formatSaving}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer border ${
                      courseFormat === mode.key
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-gray-200 text-gray-500 bg-white hover:border-gray-400 hover:text-gray-700'
                    } ${formatSaving ? 'opacity-50' : ''}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </RoleGuard>
          ) : (
            <div className="text-xs text-gray-400">
              {courseFormat === 'weekly' ? 'Weekly' : courseFormat === 'topics' ? 'Topics' : courseFormat === 'grid' ? 'Activity' : 'Sequential'} view
            </div>
          )}

          {/* Type legend */}
          {visibleTypes.length > 1 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
              {visibleTypes.map(lt => (
                <div key={lt.key} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: lt.color }} />
                  {lt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section Manager (instructor, topics/weekly) */}
      {!readOnly && (courseFormat === 'topics' || courseFormat === 'weekly') && onSectionsChange && (
        <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
          <div className="px-5 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={onToggleSectionManager}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Icon icon={showSectionManager ? 'material-symbols:expand-less' : 'material-symbols:settings'} className="w-3.5 h-3.5" />
              {showSectionManager ? 'Close' : 'Manage'} {courseFormat === 'weekly' ? 'weeks' : 'sections'}
            </button>
            {showSectionManager && (
              <div className="mt-3 space-y-3">
                {courseFormat === 'weekly' && onStartDateChange && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <Icon icon="material-symbols:calendar-month" className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <label htmlFor="course-start-date" className="text-xs font-medium text-gray-700 block">Start date</label>
                    </div>
                    <input
                      id="course-start-date"
                      type="date"
                      value={courseStartDate || ''}
                      onChange={(e) => onStartDateChange(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
              </div>
            )}
          </div>
        </RoleGuard>
      )}

      {/* Lesson list */}
      <div className="p-4 sm:p-5">
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
          onReorderLessons={readOnly ? undefined : onReorderLessons}
          onReorderSections={readOnly ? undefined : onReorderSections}
          lessonProgress={lessonProgress}
          courseStartDate={courseStartDate}
          onLessonClick={onLessonClick}
        />
      </div>
    </div>
  );
}

const CourseCurriculum = React.memo(CourseCurriculumInner);
export default CourseCurriculum;
