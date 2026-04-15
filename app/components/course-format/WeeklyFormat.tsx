'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import type { Lesson, LessonProgress, Section } from './types';
import { LessonLink, getContentMeta, StatusIcon } from './shared';

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
                      {/* Add / move lesson to this week */}
                      {editMode && onAssignSection && (
                        <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                          <div className="mt-1 flex gap-2">
                            {(() => {
                              // All lessons not currently in this section
                              const availableLessons = allLessons.filter(l => l.section_id !== section.id);
                              if (availableLessons.length > 0) {
                                return (
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        onAssignSection(e.target.value, section.id);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="flex-1 py-2 px-3 text-xs text-gray-500 bg-white border border-dashed border-gray-200 hover:border-blue-300 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  >
                                    <option value="">+ Add lesson to this week ({availableLessons.length} available)</option>
                                    {availableLessons.map(l => {
                                      const fromSection = l.section_id ? sortedSections.find(s => s.id === l.section_id) : null;
                                      const suffix = fromSection ? ` (from ${fromSection.title})` : '';
                                      return (
                                        <option key={l.id} value={l.id}>{l.title}{suffix}</option>
                                      );
                                    })}
                                  </select>
                                );
                              }
                              return null;
                            })()}
                            <Link
                              href={`/lessons/create?course_id=${courseId}`}
                              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-200 hover:border-blue-300 rounded-lg transition-colors flex-shrink-0"
                              title="Create new lesson"
                            >
                              <Icon icon="material-symbols:add" className="w-3.5 h-3.5" />
                              New
                            </Link>
                          </div>
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
  );
};

export default WeeklyFormat;
