'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import DraggableLessonList from '@/app/components/DraggableLessonList';
import type { CourseFormat } from '@/app/components/CourseFormatSelector';
import type { Section } from '@/app/components/SectionManager';

// ---- Shared types ----

interface Lesson {
  id: string;
  title: string;
  description: string;
  estimated_time: number;
  difficulty: number;
  order: number;
  published: boolean;
  section_id?: string | null;
  content_type?: string;
  prerequisite_lesson_id?: string | null;
}

interface LessonProgress {
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at?: string | null;
}

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

// ---- Lesson Link Helper ----
// Renders a <Link> for regular courses or a <button> for shared courses (via onLessonClick)
function LessonLink({ courseId, lessonId, onLessonClick, className, children, ...rest }: {
  courseId: string;
  lessonId: string;
  onLessonClick?: (lessonId: string) => void;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  if (onLessonClick) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); onLessonClick(lessonId); }}
        className={className}
        {...rest}
      >
        {children}
      </button>
    );
  }
  return (
    <Link href={`/course/${courseId}/lesson/${lessonId}`} className={className} {...rest}>
      {children}
    </Link>
  );
}

// ---- Helpers ----

const CONTENT_TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  rich_text: { icon: 'material-symbols:article', label: 'Page', color: 'text-blue-600 bg-blue-100' },
  video: { icon: 'material-symbols:play-circle', label: 'Video', color: 'text-purple-600 bg-purple-100' },
  scorm: { icon: 'material-symbols:package-2', label: 'Interactive', color: 'text-teal-600 bg-teal-100' },
  quiz: { icon: 'material-symbols:quiz', label: 'Quiz', color: 'text-amber-600 bg-amber-100' },
  assignment: { icon: 'material-symbols:edit-document', label: 'Assignment', color: 'text-green-600 bg-green-100' },
  discussion: { icon: 'material-symbols:forum', label: 'Discussion', color: 'text-indigo-600 bg-indigo-100' },
  file: { icon: 'material-symbols:attach-file', label: 'File', color: 'text-gray-600 bg-gray-100' },
  audio: { icon: 'material-symbols:headphones', label: 'Audio', color: 'text-pink-600 bg-pink-100' },
  external: { icon: 'material-symbols:open-in-new', label: 'External', color: 'text-orange-600 bg-orange-100' },
  pdf: { icon: 'material-symbols:picture-as-pdf', label: 'PDF', color: 'text-red-600 bg-red-100' },
  document: { icon: 'material-symbols:description', label: 'Document', color: 'text-cyan-600 bg-cyan-100' },
};

const getContentMeta = (type?: string) =>
  CONTENT_TYPE_META[type || 'rich_text'] || CONTENT_TYPE_META.rich_text;

const StatusIcon: React.FC<{ status?: string; className?: string }> = ({ status, className = 'w-5 h-5' }) => {
  switch (status) {
    case 'completed':
      return <Icon icon="material-symbols:check-circle" className={`${className} text-green-500`} />;
    case 'in_progress':
      return <Icon icon="material-symbols:pending" className={`${className} text-blue-500`} />;
    default:
      return <Icon icon="material-symbols:circle-outline" className={`${className} text-gray-300`} />;
  }
};

// ============================================================================
// SHARED: Course Nav Rail (desktop sidebar + mobile drawer)
// ============================================================================
// Reused across Sequential, Topics, and Weekly formats per wireframe specs.
// Shows course navigation links, activity type quick-links, and progress bar.
// ============================================================================

const NAV_LINKS = [
  { icon: 'material-symbols:home', label: 'Home', path: '' },
  { icon: 'material-symbols:view-module', label: 'Modules', path: '', active: true },
  { icon: 'material-symbols:assignment', label: 'Assignments', path: '/assignments' },
  { icon: 'material-symbols:grade', label: 'Grades', path: '/gradebook' },
  { icon: 'material-symbols:forum', label: 'Discussions', path: '/discussions' },
  { icon: 'material-symbols:folder', label: 'Files', path: '/files' },
];

interface CourseNavRailProps {
  courseId: string;
  completedCount: number;
  totalCount: number;
  /** Activity type counts for quick-link sidebar */
  typeCounts?: Record<string, number>;
  /** Active filter callback for activity quick-links */
  onFilterType?: (type: string | null) => void;
  activeFilter?: string | null;
}

const CourseNavRail: React.FC<CourseNavRailProps> = ({
  courseId,
  completedCount,
  totalCount,
  typeCounts,
  onFilterType,
  activeFilter,
}) => {
  const [showNav, setShowNav] = useState(false);
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const navContent = (mobile: boolean) => (
    <>
      {mobile && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Navigation</h3>
          <button onClick={() => setShowNav(false)} className="p-1 text-gray-400 hover:text-gray-600">
            <Icon icon="material-symbols:close" className="w-5 h-5" />
          </button>
        </div>
      )}
      {!mobile && (
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Course Navigation</h3>
      )}
      {NAV_LINKS.map(link => (
        <Link
          key={link.label}
          href={link.path ? `/course/${courseId}${link.path}` : `/course/${courseId}`}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            link.active
              ? 'bg-blue-50 text-blue-700 font-semibold border-l-3 border-blue-600'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
          onClick={mobile ? () => setShowNav(false) : undefined}
        >
          <Icon icon={link.icon} className={mobile ? 'w-5 h-5' : 'w-4.5 h-4.5'} />
          {link.label}
        </Link>
      ))}

      {/* Activity type quick-links */}
      {typeCounts && Object.keys(typeCounts).length > 0 && onFilterType && (
        <div className={mobile ? 'mt-3 pt-3 border-t border-gray-200' : 'mt-4 pt-3 border-t border-gray-200'}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Activities</h3>
          <button
            onClick={() => { onFilterType(null); if (mobile) setShowNav(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-full text-left transition-colors ${
              !activeFilter ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Icon icon="material-symbols:list" className="w-4 h-4" />
            All items ({totalCount})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => {
            const meta = getContentMeta(type);
            return (
              <button
                key={type}
                onClick={() => { onFilterType(activeFilter === type ? null : type); if (mobile) setShowNav(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-full text-left transition-colors ${
                  activeFilter === type ? `${meta.color} font-medium` : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon icon={meta.icon} className="w-4 h-4" />
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      <div className={mobile ? 'mt-4 px-3 pt-3 border-t border-gray-200' : 'mt-5 px-3 pt-4 border-t border-gray-200'}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">Course progress</span>
          {mobile && <span className="text-xs font-bold text-green-700">{progressPct}%</span>}
        </div>
        <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${mobile ? 'h-2' : 'h-2.5'}`}>
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {!mobile && (
          <span className="text-xs text-gray-500 mt-1.5 block">{completedCount} / {totalCount} items &middot; {progressPct}%</span>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop nav rail */}
      <div className="hidden lg:block w-48 flex-shrink-0">
        <div className="sticky top-24 space-y-1">
          {navContent(false)}
        </div>
      </div>

      {/* Mobile nav toggle */}
      <button
        onClick={() => setShowNav(!showNav)}
        className="lg:hidden fixed bottom-20 left-4 z-40 w-11 h-11 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        title="Course navigation"
      >
        <Icon icon="material-symbols:menu" className="w-5 h-5" />
      </button>
      {showNav && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowNav(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg p-4 space-y-1" onClick={e => e.stopPropagation()}>
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

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
  lessonProgress: LessonProgress[];
}> = ({ courseId, lessons, sections, editMode, isReorderMode, onToggleReorderMode, onReorder, onAssignSection, lessonProgress, onLessonClick }) => {
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

// ============================================================================
// FORMAT 2: TOPIC (Concept-Organized Modules)
// ============================================================================
// Upgraded: nav rail with activity type quick-links, all sections expanded by
// default, content type summary badges, section completion rings.
// ============================================================================

const TopicsFormat: React.FC<{
  courseId: string;
  lessons: Lesson[];
  sections: Section[];
  editMode: boolean;
  onAssignSection?: (lessonId: string, sectionId: string | null) => void;
  lessonProgress: LessonProgress[];
  onLessonClick?: (lessonId: string) => void;
}> = ({ courseId, lessons, sections, editMode, onAssignSection, lessonProgress, onLessonClick }) => {
  // All sections expanded by default (wireframe: "all sections visible on one page")
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const progressMap = useMemo(() => {
    const m = new Map<string, LessonProgress>();
    lessonProgress.forEach(p => m.set(p.lesson_id, p));
    return m;
  }, [lessonProgress]);

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const allLessons = useMemo(() => [...lessons].sort((a, b) => a.order - b.order), [lessons]);
  const sectionLessons = (sectionId: string) =>
    allLessons.filter(l => l.section_id === sectionId);

  const unsectionedLessons = allLessons.filter(l => !l.section_id);
  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.order - b.order), [sections]);

  // Activity type counts for nav rail quick-links
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allLessons.forEach(l => {
      const t = l.content_type || 'rich_text';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [allLessons]);

  const completedCount = allLessons.filter(l => progressMap.get(l.id)?.status === 'completed').length;

  const sectionCompletion = (sLessons: Lesson[]) => {
    if (sLessons.length === 0) return { completed: 0, total: 0, pct: 0 };
    const completed = sLessons.filter(l => progressMap.get(l.id)?.status === 'completed').length;
    return { completed, total: sLessons.length, pct: Math.round((completed / sLessons.length) * 100) };
  };

  // Filter lessons by activity type (from nav rail quick-links)
  const filterLessons = (sLessons: Lesson[]) => {
    if (!activeFilter) return sLessons;
    return sLessons.filter(l => (l.content_type || 'rich_text') === activeFilter);
  };

  return (
    <div className="relative">
      <div className="flex gap-6">
        <CourseNavRail
          courseId={courseId}
          completedCount={completedCount}
          totalCount={allLessons.length}
          typeCounts={typeCounts}
          onFilterType={setActiveFilter}
          activeFilter={activeFilter}
        />

        <div className="flex-1 min-w-0">
          {/* Active filter indicator */}
          {activeFilter && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Icon icon={getContentMeta(activeFilter).icon} className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                Showing: {getContentMeta(activeFilter).label} activities
              </span>
              <button
                onClick={() => setActiveFilter(null)}
                className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Icon icon="material-symbols:close" className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          )}

          <div className="space-y-5">
            {sortedSections.map((section, sIdx) => {
              const sLessons = sectionLessons(section.id);
              const filteredLessons = filterLessons(sLessons);
              const isCollapsed = collapsedSections.has(section.id);
              const comp = sectionCompletion(sLessons);
              const isComplete = comp.total > 0 && comp.completed === comp.total;

              // Hide section if filter active and no matching lessons
              if (activeFilter && filteredLessons.length === 0) return null;

              return (
                <div key={section.id} className={`rounded-lg border overflow-hidden transition-all ${
                  isComplete ? 'border-green-300 bg-green-50/20' : 'border-gray-200'
                }`}>
                  {/* Module header */}
                  <button
                    onClick={() => toggleCollapse(section.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50/50 transition-colors text-left"
                  >
                    {/* Completion ring */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                        <circle
                          cx="18" cy="18" r="15.5" fill="none"
                          stroke={isComplete ? '#22c55e' : '#3b82f6'}
                          strokeWidth="2.5"
                          strokeDasharray={`${comp.pct} ${100 - comp.pct}`}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isComplete ? (
                          <Icon icon="material-symbols:check" className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-xs font-bold text-gray-700">{sIdx + 1}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{section.title}</h3>
                        {isComplete && (
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">Complete</span>
                        )}
                      </div>
                      {section.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{section.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-400">{comp.completed}/{comp.total} lessons</span>
                        {/* Content type summary badges */}
                        <div className="flex items-center gap-1.5">
                          {Object.entries(
                            sLessons.reduce((acc, l) => {
                              const t = l.content_type || 'rich_text';
                              acc[t] = (acc[t] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([type, count]) => {
                            const meta = getContentMeta(type);
                            return (
                              <span key={type} className="flex items-center gap-0.5 text-xs text-gray-400" title={`${count} ${meta.label}`}>
                                <Icon icon={meta.icon} className="w-3 h-3" />
                                {count}
                              </span>
                            );
                          })}
                        </div>
                        {/* Total time for section */}
                        {sLessons.reduce((sum, l) => sum + (l.estimated_time || 0), 0) > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <Icon icon="material-symbols:schedule" className="w-3 h-3" />
                            {sLessons.reduce((sum, l) => sum + (l.estimated_time || 0), 0)} min
                          </span>
                        )}
                      </div>
                    </div>

                    <Icon
                      icon={isCollapsed ? 'material-symbols:chevron-right' : 'material-symbols:expand-more'}
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                    />
                  </button>

                  {/* Module body */}
                  {!isCollapsed && (
                    <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50/30">
                      {filteredLessons.length > 0 ? filteredLessons.map(lesson => {
                        const progress = progressMap.get(lesson.id);
                        const status = progress?.status || 'not_started';
                        const meta = getContentMeta(lesson.content_type);

                        return (
                          <div
                            key={lesson.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              status === 'completed'
                                ? 'bg-green-50/50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
                            }`}
                          >
                            <StatusIcon status={status} />
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                              <Icon icon={meta.icon} className="w-3 h-3" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-medium truncate ${status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                                {lesson.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                                {lesson.estimated_time > 0 && <span>{lesson.estimated_time} min</span>}
                                {!lesson.published && <span className="text-yellow-600 font-medium">Draft</span>}
                              </div>
                            </div>
                            {editMode && onAssignSection && sections.length > 0 && (
                              <select
                                value={lesson.section_id || ''}
                                onChange={(e) => onAssignSection(lesson.id, e.target.value || null)}
                                className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-500 max-w-[80px]"
                              >
                                <option value="">No section</option>
                                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                              </select>
                            )}
                            <LessonLink
                              courseId={courseId} lessonId={lesson.id} onLessonClick={onLessonClick}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex-shrink-0"
                            >
                              {status === 'completed' ? 'Review' : status === 'in_progress' ? 'Continue' : 'Start'}
                            </LessonLink>
                            {editMode && (
                              <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                                <Link href={`/lessons/${lesson.id}/edit`} className="p-1 text-gray-400 hover:text-gray-600">
                                  <Icon icon="material-symbols:edit" className="w-4 h-4" />
                                </Link>
                              </RoleGuard>
                            )}
                          </div>
                        );
                      }) : (
                        <p className="text-sm text-gray-400 text-center py-6">
                          {activeFilter ? 'No matching activities in this module' : 'No lessons in this module yet'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unsectioned lessons */}
            {unsectionedLessons.length > 0 && (!activeFilter || filterLessons(unsectionedLessons).length > 0) && (
              <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-dashed border-gray-300">
                  <h3 className="font-semibold text-gray-600 text-sm">Unassigned Lessons</h3>
                  <p className="text-xs text-gray-400">Use the dropdown on each lesson to assign it to a module</p>
                </div>
                <div className="p-4 space-y-2">
                  {filterLessons(unsectionedLessons).map(lesson => {
                    const meta = getContentMeta(lesson.content_type);
                    const progress = progressMap.get(lesson.id);
                    const status = progress?.status || 'not_started';
                    return (
                      <div key={lesson.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                        status === 'completed' ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'
                      }`}>
                        <StatusIcon status={status} />
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                          <Icon icon={meta.icon} className="w-3 h-3" />
                        </span>
                        <span className="flex-1 text-sm font-medium text-gray-700 truncate">{lesson.title}</span>
                        {editMode && onAssignSection && sections.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => onAssignSection(lesson.id, e.target.value || null)}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-500"
                          >
                            <option value="">Assign to...</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                          </select>
                        )}
                        <LessonLink courseId={courseId} lessonId={lesson.id} onLessonClick={onLessonClick} className="text-xs text-blue-600 font-medium">
                          {status === 'completed' ? 'Review' : status === 'in_progress' ? 'Continue' : 'Open'}
                        </LessonLink>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sections.length === 0 && unsectionedLessons.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Icon icon="material-symbols:account-tree" className="w-14 h-14 mx-auto mb-3 text-gray-200" />
                <p className="font-medium">Create topic modules above to organize your curriculum</p>
                <p className="text-xs text-gray-400 mt-1">Each module groups related lessons with shared learning objectives</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FORMAT 3: WEEKLY (Time-Paced Cohort Schedule)
// ============================================================================
// Upgraded: nav rail with activity quick-links, smart auto-expand (past + current
// expanded, future collapsed), timeline header, distribute-all for unassigned.
// ============================================================================

const WeeklyFormat: React.FC<{
  courseId: string;
  lessons: Lesson[];
  sections: Section[];
  editMode: boolean;
  onAssignSection?: (lessonId: string, sectionId: string | null) => void;
  lessonProgress: LessonProgress[];
  courseStartDate?: string | null;
  onLessonClick?: (lessonId: string) => void;
}> = ({ courseId, lessons, sections, editMode, onAssignSection, lessonProgress, courseStartDate, onLessonClick }) => {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Compute dates for sections that don't have them, using course start date
  const sectionsWithDates = useMemo(() => {
    return sections.map((section, index) => {
      if (section.start_date && section.end_date) return section;
      if (!courseStartDate) return section;
      // Calculate week dates from course start date + section order
      const base = new Date(courseStartDate + 'T00:00:00');
      const weekOffset = section.order ?? index;
      const start = new Date(base);
      start.setDate(start.getDate() + weekOffset * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return {
        ...section,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
      };
    });
  }, [sections, courseStartDate]);

  const progressMap = useMemo(() => {
    const m = new Map<string, LessonProgress>();
    lessonProgress.forEach(p => m.set(p.lesson_id, p));
    return m;
  }, [lessonProgress]);

  const allLessons = useMemo(() => [...lessons].sort((a, b) => a.order - b.order), [lessons]);
  const sectionLessons = (sectionId: string) =>
    allLessons.filter(l => l.section_id === sectionId);

  const unsectionedLessons = allLessons.filter(l => !l.section_id);
  const sortedSections = useMemo(() => [...sectionsWithDates].sort((a, b) => a.order - b.order), [sectionsWithDates]);

  // Activity type counts for nav rail
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allLessons.forEach(l => {
      const t = l.content_type || 'rich_text';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [allLessons]);

  const completedCount = allLessons.filter(l => progressMap.get(l.id)?.status === 'completed').length;

  const getWeekStatus = (start: string | null, end: string | null) => {
    if (!start || !end) return 'undated';
    const now = new Date();
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T23:59:59');
    if (now > e) return 'past';
    if (now >= s && now <= e) return 'current';
    return 'future';
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return 'Dates not set';
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
  };

  // Smart auto-expand: past + current expanded, future collapsed
  useEffect(() => {
    const expanded = new Set<string>();
    sortedSections.forEach(s => {
      const status = getWeekStatus(s.start_date, s.end_date);
      if (status === 'current' || status === 'past' || status === 'undated') {
        expanded.add(s.id);
      }
    });
    // If no sections are past/current (course hasn't started), expand all
    if (expanded.size === 0) {
      sortedSections.forEach(s => expanded.add(s.id));
    }
    setExpandedWeeks(expanded);
  }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWeek = (id: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterLessons = (sLessons: Lesson[]) => {
    if (!activeFilter) return sLessons;
    return sLessons.filter(l => (l.content_type || 'rich_text') === activeFilter);
  };

  return (
    <div className="relative">
      <div className="flex gap-6">
        <CourseNavRail
          courseId={courseId}
          completedCount={completedCount}
          totalCount={allLessons.length}
          typeCounts={typeCounts}
          onFilterType={setActiveFilter}
          activeFilter={activeFilter}
        />

        <div className="flex-1 min-w-0">
          {/* Banner: unassigned lessons */}
          {sortedSections.length > 0 && unsectionedLessons.length > 0 && editMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Icon icon="material-symbols:info" className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {unsectionedLessons.length} lesson{unsectionedLessons.length !== 1 ? 's' : ''} not assigned to any week
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Assign them individually or distribute them evenly across all weeks.
                  </p>
                </div>
              </div>
              {onAssignSection && (
                <button
                  onClick={() => {
                    const perSection = Math.ceil(unsectionedLessons.length / sortedSections.length);
                    unsectionedLessons.forEach((lesson, idx) => {
                      const sectionIdx = Math.min(Math.floor(idx / perSection), sortedSections.length - 1);
                      onAssignSection(lesson.id, sortedSections[sectionIdx].id);
                    });
                  }}
                  className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <Icon icon="material-symbols:auto-awesome" className="w-3.5 h-3.5" />
                  Distribute all
                </button>
              )}
            </div>
          )}

          {/* Active filter indicator */}
          {activeFilter && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Icon icon={getContentMeta(activeFilter).icon} className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                Showing: {getContentMeta(activeFilter).label} activities
              </span>
              <button
                onClick={() => setActiveFilter(null)}
                className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Icon icon="material-symbols:close" className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          )}

          {/* Timeline header */}
          {sortedSections.length > 0 && (
            <div className="flex items-center gap-2 px-1 mb-3">
              <Icon icon="material-symbols:calendar-month" className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {sortedSections[0]?.start_date && sortedSections[sortedSections.length - 1]?.end_date
                  ? `${formatDateRange(sortedSections[0].start_date, sortedSections[sortedSections.length - 1].end_date)} (${sortedSections.length} weeks)`
                  : `${sortedSections.length} weeks`}
              </span>
              {/* Collapse/expand all */}
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => setExpandedWeeks(new Set(sortedSections.map(s => s.id)))}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors"
                >
                  Expand all
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setExpandedWeeks(new Set())}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors"
                >
                  Collapse all
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {sortedSections.map((section, idx) => {
              const sLessons = sectionLessons(section.id);
              const filteredLessons = filterLessons(sLessons);
              const weekStatus = getWeekStatus(section.start_date, section.end_date);
              const isExpanded = expandedWeeks.has(section.id);
              const isCurrent = weekStatus === 'current';
              const isPast = weekStatus === 'past';
              const isFuture = weekStatus === 'future';

              const completedInWeek = sLessons.filter(l => progressMap.get(l.id)?.status === 'completed').length;
              const totalTime = sLessons.reduce((sum, l) => sum + (l.estimated_time || 0), 0);
              const weekComplete = sLessons.length > 0 && completedInWeek === sLessons.length;

              // Hide section if filter active and no matching lessons
              if (activeFilter && filteredLessons.length === 0 && !editMode) return null;

              return (
                <div
                  key={section.id}
                  className={`rounded-lg border overflow-hidden transition-all ${
                    isCurrent
                      ? 'border-blue-400 ring-2 ring-blue-100 shadow-md'
                      : isPast
                        ? weekComplete ? 'border-green-300' : 'border-gray-200 opacity-75'
                        : isFuture
                          ? 'border-dashed border-gray-300'
                          : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => toggleWeek(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isCurrent ? 'bg-blue-50' : isPast ? 'bg-gray-50' : isFuture ? 'bg-gray-50/50' : 'bg-white'
                    }`}
                  >
                    {/* Week number badge */}
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : weekComplete
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className="text-[10px] font-medium leading-none uppercase">Wk</span>
                      <span className="text-sm font-bold leading-none">{idx + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold ${isCurrent ? 'text-blue-900' : 'text-gray-900'}`}>{section.title}</h3>
                        {isCurrent && (
                          <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full animate-pulse">
                            THIS WEEK
                          </span>
                        )}
                        {weekComplete && (
                          <Icon icon="material-symbols:check-circle" className="w-4 h-4 text-green-500" />
                        )}
                        {isFuture && !editMode && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <Icon icon="material-symbols:schedule" className="w-3 h-3" />
                            Upcoming
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:calendar-month" className="w-3 h-3" />
                          {formatDateRange(section.start_date, section.end_date)}
                        </span>
                        <span>{sLessons.length} activities</span>
                        {totalTime > 0 && <span>~{totalTime} min</span>}
                        {sLessons.length > 0 && (
                          <span className={completedInWeek === sLessons.length ? 'text-green-600' : ''}>
                            {completedInWeek}/{sLessons.length} done
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Week progress ring */}
                    {sLessons.length > 0 && (
                      <div className="relative w-9 h-9 flex-shrink-0 hidden sm:block">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={weekComplete ? '#22c55e' : isCurrent ? '#3b82f6' : '#9ca3af'}
                            strokeWidth="2.5"
                            strokeDasharray={`${Math.round((completedInWeek / sLessons.length) * 100)} ${100 - Math.round((completedInWeek / sLessons.length) * 100)}`}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {weekComplete ? (
                            <Icon icon="material-symbols:check" className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <span className="text-[9px] font-bold text-gray-500">{Math.round((completedInWeek / sLessons.length) * 100)}%</span>
                          )}
                        </div>
                      </div>
                    )}

                    <Icon
                      icon={isExpanded ? 'material-symbols:expand-less' : 'material-symbols:expand-more'}
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                    />
                  </button>

                  {isExpanded && (
                    <div className={`border-t p-4 space-y-2 ${isCurrent ? 'border-blue-200 bg-white' : 'border-gray-100 bg-white'}`}>
                      {isFuture && !editMode ? (
                        <div className="text-center py-6">
                          <Icon icon="material-symbols:lock-clock" className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 font-medium">Available {section.start_date ? new Date(section.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'soon'}</p>
                          <p className="text-xs text-gray-400 mt-1">{sLessons.length} activities planned for this week</p>
                        </div>
                      ) : filteredLessons.length > 0 ? filteredLessons.map(lesson => {
                        const progress = progressMap.get(lesson.id);
                        const status = progress?.status || 'not_started';
                        const meta = getContentMeta(lesson.content_type);

                        return (
                          <div
                            key={lesson.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              status === 'completed'
                                ? 'bg-green-50/50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-blue-200'
                            }`}
                          >
                            <StatusIcon status={status} />
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                              <Icon icon={meta.icon} className="w-3 h-3" />
                              {meta.label}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-medium truncate ${status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                                {lesson.title}
                              </h4>
                              {lesson.estimated_time > 0 && (
                                <span className="text-xs text-gray-400">{lesson.estimated_time} min</span>
                              )}
                            </div>
                            {editMode && onAssignSection && sections.length > 0 && (
                              <select
                                value={lesson.section_id || ''}
                                onChange={(e) => onAssignSection(lesson.id, e.target.value || null)}
                                className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-500 max-w-[80px]"
                              >
                                <option value="">No week</option>
                                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                              </select>
                            )}
                            <LessonLink
                              courseId={courseId} lessonId={lesson.id} onLessonClick={onLessonClick}
                              className={`text-xs font-medium flex-shrink-0 ${
                                status === 'completed' ? 'text-green-600' : 'text-blue-600 hover:text-blue-700'
                              }`}
                            >
                              {status === 'completed' ? 'Review' : status === 'in_progress' ? 'Continue' : 'Start'}
                            </LessonLink>
                            {editMode && (
                              <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                                <Link href={`/lessons/${lesson.id}/edit`} className="p-1 text-gray-400 hover:text-gray-600">
                                  <Icon icon="material-symbols:edit" className="w-4 h-4" />
                                </Link>
                              </RoleGuard>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-400">
                            {activeFilter ? 'No matching activities this week' : 'No activities scheduled this week'}
                          </p>
                        </div>
                      )}
                      {/* Add existing lesson to this week */}
                      {editMode && onAssignSection && unsectionedLessons.length > 0 && (
                        <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                          <div className="mt-1">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  onAssignSection(e.target.value, section.id);
                                  e.target.value = '';
                                }
                              }}
                              className="w-full py-2 px-3 text-xs text-gray-500 bg-white border border-dashed border-gray-200 hover:border-blue-300 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
                              style={{ backgroundImage: 'none' }}
                            >
                              <option value="">+ Add lesson to this week ({unsectionedLessons.length} available)</option>
                              {unsectionedLessons.map(l => (
                                <option key={l.id} value={l.id}>{l.title}</option>
                              ))}
                            </select>
                          </div>
                        </RoleGuard>
                      )}
                      {editMode && unsectionedLessons.length === 0 && (
                        <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                          <Link
                            href={`/lessons/create?course_id=${courseId}`}
                            className="flex items-center justify-center gap-1.5 w-full py-2 mt-1 text-xs font-medium text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-200 hover:border-blue-300 rounded-lg transition-colors"
                          >
                            <Icon icon="material-symbols:add" className="w-3.5 h-3.5" />
                            Create new lesson
                          </Link>
                        </RoleGuard>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unscheduled lessons */}
            {unsectionedLessons.length > 0 && (
              <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-600 text-sm">Unscheduled Activities</h3>
                    <p className="text-xs text-gray-400">{unsectionedLessons.length} lesson{unsectionedLessons.length !== 1 ? 's' : ''} not yet assigned to a week</p>
                  </div>
                  {editMode && onAssignSection && sortedSections.length > 0 && (
                    <button
                      onClick={() => {
                        const perSection = Math.ceil(unsectionedLessons.length / sortedSections.length);
                        unsectionedLessons.forEach((lesson, idx) => {
                          const sectionIdx = Math.min(Math.floor(idx / perSection), sortedSections.length - 1);
                          onAssignSection(lesson.id, sortedSections[sectionIdx].id);
                        });
                      }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Icon icon="material-symbols:auto-awesome" className="w-3.5 h-3.5" />
                      Distribute across weeks
                    </button>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  {filterLessons(unsectionedLessons).map(lesson => {
                    const meta = getContentMeta(lesson.content_type);
                    return (
                      <div key={lesson.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                          <Icon icon={meta.icon} className="w-3 h-3" />
                        </span>
                        <span className="flex-1 text-sm font-medium text-gray-700 truncate">{lesson.title}</span>
                        {editMode && onAssignSection && sections.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => onAssignSection(lesson.id, e.target.value || null)}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-500"
                          >
                            <option value="">Assign to week...</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sortedSections.length === 0 && unsectionedLessons.length === 0 && lessons.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <Icon icon="material-symbols:calendar-month" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No weekly schedule yet</p>
                <p className="text-sm text-gray-400 mt-1">Create weeks using the Section Manager, then add lessons.</p>
                <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                  <Link
                    href={`/lessons/create?course_id=${courseId}`}
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Icon icon="material-symbols:add" className="w-4 h-4" />
                    Create Lesson
                  </Link>
                </RoleGuard>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FORMAT 4: ACTIVITY DASHBOARD (Self-Directed Exploration)
// ============================================================================
// Upgraded: progress bars on cards, color category banners, thumbnail-style card
// headers, improved responsive grid, status badges per wireframe 03.
// ============================================================================

const CARD_COLORS: Record<string, string> = {
  rich_text: 'from-blue-500 to-blue-600',
  video: 'from-blue-600 to-blue-700',
  scorm: 'from-teal-500 to-teal-600',
  quiz: 'from-amber-500 to-amber-600',
  assignment: 'from-green-500 to-green-600',
  discussion: 'from-blue-600 to-blue-700',
  file: 'from-gray-500 to-gray-600',
  audio: 'from-pink-500 to-pink-600',
  external: 'from-orange-500 to-orange-600',
  pdf: 'from-red-500 to-red-600',
  document: 'from-cyan-500 to-cyan-600',
};

const ActivityDashboardFormat: React.FC<{
  courseId: string;
  lessons: Lesson[];
  editMode: boolean;
  lessonProgress: LessonProgress[];
  onLessonClick?: (lessonId: string) => void;
}> = ({ courseId, lessons, editMode, lessonProgress, onLessonClick }) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const progressMap = useMemo(() => {
    const m = new Map<string, LessonProgress>();
    lessonProgress.forEach(p => m.set(p.lesson_id, p));
    return m;
  }, [lessonProgress]);

  const sorted = [...lessons].sort((a, b) => a.order - b.order);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sorted.forEach(l => {
      const t = l.content_type || 'rich_text';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [sorted]);

  const completedCount = sorted.filter(l => progressMap.get(l.id)?.status === 'completed').length;
  const inProgressCount = sorted.filter(l => progressMap.get(l.id)?.status === 'in_progress').length;
  const totalTime = sorted.reduce((sum, l) => sum + (l.estimated_time || 0), 0);

  const filtered = activeFilter
    ? sorted.filter(l => (l.content_type || 'rich_text') === activeFilter)
    : sorted;

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Icon icon="material-symbols:dashboard" className="w-14 h-14 mx-auto mb-3 text-gray-200" />
        <p className="font-medium">No activities yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Dashboard header with stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">{sorted.length}</div>
          <div className="text-xs text-blue-600 font-medium">Total Activities</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
          <div className="text-2xl font-bold text-green-700">{completedCount}</div>
          <div className="text-xs text-green-600 font-medium">Completed</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
          <div className="text-2xl font-bold text-amber-700">{inProgressCount}</div>
          <div className="text-xs text-amber-600 font-medium">In Progress</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
          <div className="text-2xl font-bold text-purple-700">
            {totalTime > 60 ? `${Math.round(totalTime / 60)}h` : `${totalTime}m`}
          </div>
          <div className="text-xs text-purple-600 font-medium">Total Time</div>
        </div>
      </div>

      {/* Overall progress bar */}
      {sorted.length > 0 && (
        <div className="mb-5 bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-gray-900">{Math.round((completedCount / sorted.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.round((completedCount / sorted.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter chips by content type */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">Filter:</span>
        <button
          onClick={() => setActiveFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !activeFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({sorted.length})
        </button>
        {Object.entries(typeCounts).map(([type, count]) => {
          const meta = getContentMeta(type);
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(activeFilter === type ? null : type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === type ? `${meta.color} ring-1 ring-current` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon icon={meta.icon} className="w-3.5 h-3.5" />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Activity grid — 3-col at lg, 2-col at sm, 1-col below */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(lesson => {
          const progress = progressMap.get(lesson.id);
          const status = progress?.status || 'not_started';
          const meta = getContentMeta(lesson.content_type);
          const cardGradient = CARD_COLORS[lesson.content_type || 'rich_text'] || CARD_COLORS.rich_text;

          return (
            <LessonLink
              key={lesson.id}
              courseId={courseId} lessonId={lesson.id} onLessonClick={onLessonClick}
              className={`block rounded-lg border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 group ${
                status === 'completed'
                  ? 'border-green-200'
                  : status === 'in_progress'
                    ? 'border-blue-200'
                    : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {/* Card header — gradient banner with type icon */}
              <div className={`bg-gradient-to-br ${cardGradient} px-4 py-5 relative`}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Icon icon={meta.icon} className="w-6 h-6 text-white" />
                  </div>
                  {/* Status badge */}
                  {status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-green-900 bg-green-200 rounded-full">
                      <Icon icon="material-symbols:check" className="w-3 h-3" />
                      Done
                    </span>
                  ) : status === 'in_progress' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-blue-900 bg-blue-200 rounded-full animate-pulse">
                      In Progress
                    </span>
                  ) : null}
                </div>
                {/* Category label */}
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-3 block">
                  {meta.label}
                </span>
              </div>

              {/* Progress bar (visible when enrolled/in-progress) */}
              {status !== 'not_started' && (
                <div className="h-1 bg-gray-100">
                  <div
                    className={`h-1 transition-all duration-500 ${
                      status === 'completed' ? 'bg-green-500 w-full' : 'bg-blue-500 w-1/2'
                    }`}
                  />
                </div>
              )}

              <div className="p-4">
                <h4 className="font-semibold text-gray-900 text-sm mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {lesson.title}
                </h4>

                {lesson.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{lesson.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {lesson.estimated_time > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Icon icon="material-symbols:schedule" className="w-3 h-3" />
                        {lesson.estimated_time}m
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Icon icon="material-symbols:trending-up" className="w-3 h-3" />
                      L{lesson.difficulty}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${
                    status === 'completed' ? 'text-green-600' : status === 'in_progress' ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {status === 'completed' ? 'Review' : status === 'in_progress' ? 'Continue' : 'Start'} &rarr;
                  </span>
                </div>

                {!lesson.published && (
                  <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 rounded px-2 py-0.5 inline-block font-medium">Draft</div>
                )}
              </div>
            </LessonLink>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
