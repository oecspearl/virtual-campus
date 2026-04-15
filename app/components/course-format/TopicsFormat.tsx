'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import type { Lesson, LessonProgress, Section } from './types';
import { LessonLink, getContentMeta, StatusIcon } from './shared';

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

  const inProgressCount = allLessons.filter(l => progressMap.get(l.id)?.status === 'in_progress').length;
  const totalMinutes = allLessons.reduce((sum, l) => sum + (l.estimated_time || 0), 0);
  const progressPct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  return (
    <div>
      {/* Stats + Progress bar */}
      <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Total Activities</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{allLessons.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Completed</p>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">{completedCount}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">In Progress</p>
            <p className="text-lg font-bold text-blue-600 mt-0.5">{inProgressCount}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Total Time</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{totalMinutes > 60 ? `${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs font-bold text-emerald-700 tabular-nums whitespace-nowrap">{progressPct}%</span>
        </div>
      </div>

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
                                {lesson.locked && (
                                  <span className="text-orange-600 font-medium flex items-center gap-0.5" title="Locked by admin">
                                    <Icon icon="material-symbols:lock" className="w-3 h-3" />
                                    Locked
                                  </span>
                                )}
                                {lesson.class_id && (
                                  <span className="text-indigo-600 font-medium">Section-specific</span>
                                )}
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
  );
};

export default TopicsFormat;
