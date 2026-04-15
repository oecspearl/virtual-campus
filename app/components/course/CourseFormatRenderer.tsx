'use client';

import React from 'react';
import type { Lesson, LessonProgress, CourseFormat, Section } from '../course-format/types';
import SequentialFormat from '../course-format/SequentialFormat';
import TopicsFormat from '../course-format/TopicsFormat';
import WeeklyFormat from '../course-format/WeeklyFormat';
import ActivityDashboardFormat from '../course-format/ActivityDashboardFormat';

interface CourseFormatRendererProps {
  courseId: string;
  lessons: Lesson[];
  sections: Section[];
  format: CourseFormat;
  isReorderMode: boolean;
  onToggleReorderMode: () => void;
  onReorder: (lessons: Lesson[]) => void;
  editMode?: boolean;
  onAssignSection?: (lessonId: string, sectionId: string | null) => void;
  lessonProgress?: LessonProgress[];
  courseStartDate?: string | null;
  /** When provided, lesson clicks call this instead of navigating to /course/[id]/lesson/[lessonId]. Used by shared courses. */
  onLessonClick?: (lessonId: string) => void;
}

const CourseFormatRenderer: React.FC<CourseFormatRendererProps> = ({
  courseId,
  lessons,
  sections,
  format,
  isReorderMode,
  onToggleReorderMode,
  onReorder,
  editMode = true,
  onAssignSection,
  lessonProgress = [],
  courseStartDate,
  onLessonClick,
}) => {
  switch (format) {
    case 'topics':
      return (
        <TopicsFormat
          courseId={courseId}
          lessons={lessons}
          sections={sections}
          editMode={editMode}
          onAssignSection={onAssignSection}
          lessonProgress={lessonProgress}
          onLessonClick={onLessonClick}
        />
      );
    case 'weekly':
      return (
        <WeeklyFormat
          courseId={courseId}
          lessons={lessons}
          sections={sections}
          editMode={editMode}
          onAssignSection={onAssignSection}
          lessonProgress={lessonProgress}
          courseStartDate={courseStartDate}
          onLessonClick={onLessonClick}
        />
      );
    case 'grid':
      return (
        <ActivityDashboardFormat
          courseId={courseId}
          lessons={lessons}
          editMode={editMode}
          lessonProgress={lessonProgress}
          onLessonClick={onLessonClick}
        />
      );
    case 'lessons':
    default:
      return (
        <SequentialFormat
          courseId={courseId}
          lessons={lessons}
          sections={sections}
          editMode={editMode}
          isReorderMode={isReorderMode}
          onToggleReorderMode={onToggleReorderMode}
          onReorder={onReorder}
          onAssignSection={onAssignSection}
          lessonProgress={lessonProgress}
          onLessonClick={onLessonClick}
        />
      );
  }
};

export default CourseFormatRenderer;
