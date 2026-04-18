'use client';

import React from 'react';
import { formatTime } from '@/lib/video/utils';

export interface VideoChapter {
  time: number;
  title: string;
  description?: string;
}

interface ChapterSidebarProps {
  chapters: VideoChapter[];
  onSeek: (time: number) => void;
  currentTime: number;
}

/**
 * Vertical list of video chapters with the current chapter highlighted
 * and auto-scrolled into view. Renders nothing when `chapters` is empty.
 */
export default function ChapterSidebar({ chapters, onSeek, currentTime }: ChapterSidebarProps) {
  const activeRef = React.useRef<HTMLButtonElement>(null);

  const currentChapterIdx = chapters.reduce(
    (acc, ch, i) => (currentTime >= ch.time ? i : acc),
    0
  );

  // Auto-scroll the active chapter button into view
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentChapterIdx]);

  if (chapters.length === 0) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          Chapters
          <span className="text-gray-400 font-normal">({chapters.length})</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {chapters.map((ch, i) => {
          const isActive = i === currentChapterIdx;
          return (
            <button
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSeek(ch.time)}
              className={`w-full text-left px-2.5 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-800 font-medium ring-1 ring-blue-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span
                className={`text-[11px] font-mono flex-shrink-0 w-10 ${
                  isActive ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                {formatTime(ch.time)}
              </span>
              <span className="flex-1 leading-snug text-[13px]">{ch.title}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
