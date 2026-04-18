'use client';

import React from 'react';
import VideoNotesPanel from '@/app/components/media/VideoNotesPanel';
import ChapterSidebar, { type VideoChapter } from './ChapterSidebar';

interface VideoSidebarProps {
  /** Chapters to show. Pass [] to hide the chapters panel. */
  chapters: VideoChapter[];
  /** Whether the notes panel should be shown when a lessonId is available. */
  showNotes?: boolean;
  /** Lesson id for the notes panel. Without it, notes show a placeholder. */
  lessonId?: string;
  /** Optional course id, passed through to the notes panel. */
  courseId?: string;
  /** Current playback time — used to highlight the active chapter. */
  currentTime: number;
  /** Called when the user clicks a chapter or a note timestamp. */
  onSeek: (time: number) => void;
  /** The video element (or entire player) to render beside the sidebar. */
  children: React.ReactNode;
  /** Optional max-height override for the sidebar (`lg:max-h-[...]`). */
  maxHeightClass?: string;
}

/**
 * Shared chapters + notes sidebar used by both EmbedPlayer and the
 * self-hosted video player. Shows one of four layouts:
 *   - No sidebar at all (no chapters, notes off) — just the video.
 *   - Chapters only.
 *   - Notes only.
 *   - Tabs (both chapters and notes available).
 *
 * Manages the chapter/notes tab state internally. The parent passes in
 * the video element as `children` so both embed iframes and custom
 * `<video>` elements can be wrapped without duplicating layout logic.
 */
export default function VideoSidebar({
  chapters,
  showNotes = false,
  lessonId,
  courseId,
  currentTime,
  onSeek,
  children,
  maxHeightClass = 'lg:max-h-[400px]',
}: VideoSidebarProps) {
  const [tab, setTab] = React.useState<'chapters' | 'notes'>('chapters');

  const hasChapters = chapters.length > 0;
  const hasSidebar = hasChapters || showNotes;

  if (!hasSidebar) {
    return <div className="w-full mx-auto max-w-full">{children}</div>;
  }

  return (
    <div className="w-full mx-auto max-w-full flex flex-col lg:flex-row gap-0 rounded-lg overflow-hidden border border-gray-200">
      <div
        className={`lg:w-56 xl:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white max-h-48 ${maxHeightClass} overflow-hidden flex flex-col`}
      >
        {hasChapters && showNotes ? (
          <>
            <div className="flex border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setTab('chapters')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === 'chapters'
                    ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Chapters
              </button>
              <button
                onClick={() => setTab('notes')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === 'notes'
                    ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Notes
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {tab === 'chapters' ? (
                <ChapterSidebar chapters={chapters} onSeek={onSeek} currentTime={currentTime} />
              ) : lessonId ? (
                <VideoNotesPanel
                  lessonId={lessonId}
                  courseId={courseId}
                  currentTime={currentTime}
                  onSeek={onSeek}
                />
              ) : (
                <div className="p-3 text-xs text-gray-400 text-center">
                  Notes require a saved lesson
                </div>
              )}
            </div>
          </>
        ) : hasChapters ? (
          <ChapterSidebar chapters={chapters} onSeek={onSeek} currentTime={currentTime} />
        ) : showNotes && lessonId ? (
          <VideoNotesPanel
            lessonId={lessonId}
            courseId={courseId}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
