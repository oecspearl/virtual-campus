'use client';

import React from 'react';
import { ChevronsDownUp, ChevronsUpDown, StickyNote } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';

interface StudyToolbarProps {
  /** Whether all collapsible items are currently collapsed. */
  allCollapsed: boolean;
  /** Count of currently-collapsed items (for the small "X collapsed" hint). */
  collapsedCount: number;
  /** Lesson id — passed through to the bookmark button. */
  lessonId: string;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onOpenNotes: () => void;
}

/**
 * Sticky toolbar that sits above the lesson content. Contains:
 *   - Collapse-all / expand-all toggle (with a small hint showing how
 *     many sections are currently collapsed)
 *   - Lesson bookmark button
 *   - Open-notes button (opens the NotesPanel)
 *
 * Stateless — the parent owns collapse state and the notes panel's
 * open/closed state.
 */
export default function StudyToolbar({
  allCollapsed,
  collapsedCount,
  lessonId,
  onCollapseAll,
  onExpandAll,
  onOpenNotes,
}: StudyToolbarProps) {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 mb-4 sm:mb-5 -mx-5 sm:-mx-8 px-5 sm:px-8 py-2">
      <div className="flex items-center justify-between gap-2">
        {/* Collapse controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={allCollapsed ? onExpandAll : onCollapseAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors text-xs"
            title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
          >
            {allCollapsed ? (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expand All</span>
              </>
            ) : (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Collapse All</span>
              </>
            )}
          </button>
          {collapsedCount > 0 && (
            <span className="text-[10px] text-slate-300 hidden sm:inline">
              {collapsedCount} collapsed
            </span>
          )}
        </div>

        {/* Study tools */}
        <div className="flex items-center gap-1.5">
          <BookmarkButton
            type="lesson"
            id={lessonId}
            size="md"
            showLabel
            className="hover:bg-gray-50"
          />
          <button
            onClick={onOpenNotes}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors text-xs"
            title="Open notes"
          >
            <StickyNote className="w-4 h-4" />
            <span>Notes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
