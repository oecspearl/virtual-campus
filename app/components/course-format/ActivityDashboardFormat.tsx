'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import type { Lesson, LessonProgress } from './types';
import { LessonLink, getContentMeta } from './shared';

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
              className={`flex flex-col h-full w-full text-left rounded-lg border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 group ${
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

              <div className="p-4 flex-1 flex flex-col">
                <h4 className="font-semibold text-gray-900 text-sm mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {lesson.title}
                </h4>

                {lesson.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{lesson.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
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

export default ActivityDashboardFormat;
