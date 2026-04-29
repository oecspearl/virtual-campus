'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import DraggableLessonList from '@/app/components/course/DraggableLessonList';
import type { Lesson, LessonProgress, Section } from './types';
import { LessonLink, getContentMeta, CourseNavRail } from './shared';

// ============================================================================
// FORMAT 1: SEQUENTIAL MODULE STREAM (Canvas-style Mastery Progression)
// ============================================================================

const SequentialFormat: React.FC<{
  courseId: string;
  lessons: Lesson[];
  sections: Section[];
  editMode: boolean;
  isReorderMode: boolean;
  onToggleReorderMode: () => void;
  onReorder: (lessons: Lesson[]) => void;
  onLessonClick?: (lessonId: string) => void;
  onAssignSection?: (lessonId: string, sectionId: string | null) => void;
  onLessonDeleted?: (lessonId: string) => void;
  lessonProgress: LessonProgress[];
}> = ({ courseId, lessons, sections, editMode, isReorderMode, onToggleReorderMode, onReorder, onAssignSection, onLessonDeleted, lessonProgress, onLessonClick }) => {
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => [...lessons].sort((a, b) => a.order - b.order), [lessons]);
  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.order - b.order), [sections]);

  const progressMap = useMemo(() => {
    const m = new Map<string, LessonProgress>();
    lessonProgress.forEach(p => m.set(p.lesson_id, p));
    return m;
  }, [lessonProgress]);

  const flatItems = useMemo(() => {
    if (sortedSections.length === 0) return sorted;
    const items: Lesson[] = [];
    for (const section of sortedSections) {
      const sLessons = sorted.filter(l => l.section_id === section.id);
      items.push(...sLessons);
    }
    const unsectioned = sorted.filter(l => !l.section_id);
    items.push(...unsectioned);
    return items;
  }, [sorted, sortedSections]);

  const moduleCompletion = useMemo(() => {
    const map = new Map<string, { completed: number; total: number; allDone: boolean }>();
    for (const section of sortedSections) {
      const sLessons = sorted.filter(l => l.section_id === section.id);
      const completed = sLessons.filter(l => progressMap.get(l.id)?.status === 'completed').length;
      map.set(section.id, { completed, total: sLessons.length, allDone: sLessons.length > 0 && completed === sLessons.length });
    }
    return map;
  }, [sortedSections, sorted, progressMap]);

  const isModuleLocked = (sectionIndex: number): boolean => {
    if (editMode || sectionIndex === 0) return false;
    const prevSection = sortedSections[sectionIndex - 1];
    if (!prevSection) return false;
    const prevComp = moduleCompletion.get(prevSection.id);
    return !prevComp?.allDone;
  };

  const isItemLocked = (lesson: Lesson, indexInModule: number, sectionIndex: number): boolean => {
    if (editMode) return false;
    if (isModuleLocked(sectionIndex)) return true;
    if (indexInModule === 0) return false;
    const moduleLessons = sorted.filter(l => l.section_id === sortedSections[sectionIndex]?.id);
    const prevLesson = moduleLessons[indexInModule - 1];
    if (prevLesson) {
      const prevStatus = progressMap.get(prevLesson.id)?.status;
      if (prevStatus !== 'completed') return true;
    }
    if (lesson.prerequisite_lesson_id) {
      const prereqStatus = progressMap.get(lesson.prerequisite_lesson_id)?.status;
      if (prereqStatus !== 'completed') return true;
    }
    return false;
  };

  const currentItemId = useMemo(() => {
    for (let si = 0; si < sortedSections.length; si++) {
      if (isModuleLocked(si)) continue;
      const sLessons = sorted.filter(l => l.section_id === sortedSections[si].id);
      for (let li = 0; li < sLessons.length; li++) {
        const status = progressMap.get(sLessons[li].id)?.status;
        if (status !== 'completed' && !isItemLocked(sLessons[li], li, si)) {
          return sLessons[li].id;
        }
      }
    }
    const unsectioned = sorted.filter(l => !l.section_id);
    for (const l of unsectioned) {
      if (progressMap.get(l.id)?.status !== 'completed') return l.id;
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedSections, sorted, progressMap, editMode]);

  const currentFlatIndex = currentItemId ? flatItems.findIndex(l => l.id === currentItemId) : -1;
  const prevItem = currentFlatIndex > 0 ? flatItems[currentFlatIndex - 1] : null;
  const nextItem = currentFlatIndex >= 0 && currentFlatIndex < flatItems.length - 1 ? flatItems[currentFlatIndex + 1] : null;

  const completedCount = lessonProgress.filter(p => p.status === 'completed').length;
  const totalCount = sorted.length;

  const toggleModule = (id: string) => {
    setCollapsedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (isReorderMode || editMode) {
    return (
      <DraggableLessonList
        lessons={lessons}
        courseId={courseId}
        onReorder={onReorder}
        isReorderMode={isReorderMode}
        onToggleReorderMode={onToggleReorderMode}
        editMode={editMode}
        onLessonDeleted={onLessonDeleted}
      />
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Icon icon="material-symbols:route" className="w-14 h-14 mx-auto mb-3 text-gray-200" />
        <p className="font-medium">No lessons in this course yet</p>
      </div>
    );
  }

  const hasModules = sortedSections.length > 0;
  const unsectionedLessons = sorted.filter(l => !l.section_id);

  const renderItem = (lesson: Lesson, locked: boolean, isCurrent: boolean) => {
    const progress = progressMap.get(lesson.id);
    const status = progress?.status || 'not_started';
    const isDone = status === 'completed';
    const isInProgress = status === 'in_progress';
    const meta = getContentMeta(lesson.content_type);

    return (
      <div
        key={lesson.id}
        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 transition-all group ${
          locked ? 'opacity-50 bg-gray-50/60' :
          isCurrent ? 'bg-blue-50/60' :
          isDone ? 'bg-green-50/30' :
          'bg-white hover:bg-gray-50'
        }`}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          locked ? 'bg-gray-200' :
          isDone ? 'bg-green-100' :
          isCurrent || isInProgress ? 'bg-blue-100 ring-2 ring-blue-300 ring-offset-1' :
          'bg-gray-100'
        }`}>
          {locked ? (
            <Icon icon="material-symbols:lock" className="w-3.5 h-3.5 text-gray-400" />
          ) : isDone ? (
            <Icon icon="material-symbols:check" className="w-4 h-4 text-green-600" />
          ) : isCurrent || isInProgress ? (
            <Icon icon="material-symbols:play-arrow" className="w-4 h-4 text-blue-600" />
          ) : (
            <Icon icon="material-symbols:circle-outline" className="w-4 h-4 text-gray-300" />
          )}
        </div>

        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${meta.color}`}>
          <Icon icon={meta.icon} className="w-3 h-3" />
          {meta.label}
        </span>

        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium truncate ${
            locked ? 'text-gray-400' :
            isDone ? 'text-gray-500' :
            'text-gray-900'
          }`}>
            {lesson.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
            <span>{meta.label}</span>
            {lesson.estimated_time > 0 && (
              <>
                <span className="text-gray-300">&middot;</span>
                <span>{lesson.estimated_time} min</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          {locked ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-md">
              <Icon icon="material-symbols:lock" className="w-3 h-3" />
              Locked
            </span>
          ) : isDone ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md">
              <Icon icon="material-symbols:check" className="w-3 h-3" />
              Done
            </span>
          ) : isCurrent || isInProgress ? (
            <LessonLink
              courseId={courseId} lessonId={lesson.id} onLessonClick={onLessonClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Icon icon="material-symbols:play-arrow" className="w-3.5 h-3.5" />
              {isInProgress ? 'Continue' : 'Start'}
            </LessonLink>
          ) : (
            <LessonLink
              courseId={courseId} lessonId={lesson.id} onLessonClick={onLessonClick}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors opacity-0 group-hover:opacity-100"
            >
              Preview
            </LessonLink>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="flex gap-6">
        <CourseNavRail courseId={courseId} completedCount={completedCount} totalCount={totalCount} />

        <div className="flex-1 min-w-0">
          {/* Top bar: progress indicator */}
          <div className="flex items-center justify-between mb-5 bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Icon icon="material-symbols:view-module" className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Modules</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {completedCount} / {totalCount}
              </span>
              <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Module list */}
          <div className="space-y-4">
            {hasModules && sortedSections.map((section, sIdx) => {
              const sLessons = sorted.filter(l => l.section_id === section.id);
              const comp = moduleCompletion.get(section.id) || { completed: 0, total: 0, allDone: false };
              const moduleLocked = isModuleLocked(sIdx);
              const isCollapsed = collapsedModules.has(section.id);

              return (
                <div
                  key={section.id}
                  className={`rounded-lg border overflow-hidden transition-all ${
                    moduleLocked ? 'border-gray-200 opacity-70' :
                    comp.allDone ? 'border-green-300 bg-green-50/10' :
                    'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => !moduleLocked && toggleModule(section.id)}
                    disabled={moduleLocked}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                      moduleLocked ? 'bg-gray-50 cursor-not-allowed' :
                      comp.allDone ? 'bg-green-50/50 hover:bg-green-50' :
                      'bg-white hover:bg-gray-50/80'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      moduleLocked ? 'bg-gray-200 text-gray-400' :
                      comp.allDone ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {moduleLocked ? (
                        <Icon icon="material-symbols:lock" className="w-5 h-5" />
                      ) : comp.allDone ? (
                        <Icon icon="material-symbols:check" className="w-5 h-5" />
                      ) : (
                        sIdx + 1
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold ${moduleLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                          MODULE {sIdx + 1} — {section.title}
                        </h3>
                      </div>
                      {section.description && (
                        <p className={`text-xs mt-0.5 line-clamp-1 ${moduleLocked ? 'text-gray-300' : 'text-gray-500'}`}>
                          {section.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        moduleLocked ? 'bg-gray-100 text-gray-400' :
                        comp.allDone ? 'bg-green-100 text-green-700' :
                        comp.completed > 0 ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {moduleLocked ? 'Locked' :
                         comp.allDone ? `${comp.completed}/${comp.total} complete` :
                         comp.total > 0 ? `${comp.completed}/${comp.total}${comp.completed > 0 ? '' : ' · open'}` :
                         'Empty'}
                      </span>
                      {!moduleLocked && (
                        <Icon
                          icon={isCollapsed ? 'material-symbols:expand-more' : 'material-symbols:expand-less'}
                          className="w-5 h-5 text-gray-400"
                        />
                      )}
                    </div>
                  </button>

                  {!isCollapsed && !moduleLocked && (
                    <div className="border-t border-gray-100">
                      {sLessons.length > 0 ? sLessons.map((lesson, lIdx) => {
                        const locked = isItemLocked(lesson, lIdx, sIdx);
                        const isCurrent = lesson.id === currentItemId;
                        return renderItem(lesson, locked, isCurrent);
                      }) : (
                        <div className="px-5 py-6 text-center text-sm text-gray-400">
                          <Icon icon="material-symbols:inbox" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          No items in this module yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unsectioned lessons */}
            {unsectionedLessons.length > 0 && (
              <div className={`rounded-lg border border-gray-200 overflow-hidden ${!hasModules ? '' : 'border-dashed'}`}>
                {hasModules && (
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                    <Icon icon="material-symbols:list" className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-700 text-sm">General Items</h3>
                    <span className="text-xs text-gray-400 ml-auto">{unsectionedLessons.length} items</span>
                  </div>
                )}
                {unsectionedLessons.map((lesson, idx) => {
                  const isCurrent = lesson.id === currentItemId;
                  const prevDone = idx === 0 || progressMap.get(unsectionedLessons[idx - 1].id)?.status === 'completed';
                  const locked = !editMode && idx > 0 && !prevDone;
                  return renderItem(lesson, locked, isCurrent);
                })}
              </div>
            )}
          </div>

          {/* Footer navigation */}
          <div className="mt-6 flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div>
              {prevItem ? (
                <LessonLink
                  courseId={courseId} lessonId={prevItem.id} onLessonClick={onLessonClick}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Icon icon="material-symbols:chevron-left" className="w-5 h-5" />
                  <span className="hidden sm:inline truncate max-w-[160px]">{prevItem.title}</span>
                  <span className="sm:hidden">Previous</span>
                </LessonLink>
              ) : <div />}
            </div>

            <span className="text-xs text-gray-400">
              Item {currentFlatIndex >= 0 ? currentFlatIndex + 1 : '–'} of {totalCount}
            </span>

            <div>
              {nextItem ? (
                <LessonLink
                  courseId={courseId} lessonId={nextItem.id} onLessonClick={onLessonClick}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <span className="hidden sm:inline truncate max-w-[160px]">{nextItem.title}</span>
                  <span className="sm:hidden">Next</span>
                  <Icon icon="material-symbols:chevron-right" className="w-5 h-5" />
                </LessonLink>
              ) : <div />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequentialFormat;
