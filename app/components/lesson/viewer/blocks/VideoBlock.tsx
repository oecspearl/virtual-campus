'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import { sanitizeHtml } from '@/lib/sanitize';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

// Lazily load VideoPlayer — its bundle is heavy (~200KB) and many
// lessons don't contain video content.
const VideoPlayer = dynamic(() => import('@/app/components/media/VideoPlayer'), {
  ssr: false,
  loading: () => <div className="w-full aspect-video bg-gray-100 animate-pulse rounded-lg" />,
});

// Shape used below; mirrors VideoPlayer's onWatchProgress payload.
export interface WatchProgressData {
  currentTime: number;
  duration: number;
  percentWatched: number;
  totalWatchTime: number;
  segments: [number, number][];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VideoChapter = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VideoCaption = any;

export interface VideoBlockProps {
  index: number;
  lessonId: string;
  courseId?: string;
  /** Optional header title. Block is collapsible only when a title is set. */
  title?: string;
  /** Video src URL (or raw string, for legacy data shape). */
  src: string;
  /** Optional internal video title (passed to the player). */
  videoTitle?: string;
  /** Optional chapter markers. */
  chapters?: VideoChapter[];
  /** Optional caption tracks. */
  captions?: VideoCaption[];
  /** Optional audio-description track source. */
  audioDescriptionSrc?: string;
  /** Whether to forbid skipping past watched content. */
  preventSkipping?: boolean;
  /**
   * Rich-text description shown as "Notes" below the player.
   * Rendered with sanitizeHtml.
   */
  description?: string;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;

  /** Fires once the first time the block is expanded/visible. */
  onFirstVisible?: () => void;
  /** Streams watch-progress updates from the underlying VideoPlayer. */
  onWatchProgress?: (data: WatchProgressData) => void;
  /** Fires when the player detects the total duration. */
  onDurationDetected?: (duration: number) => void;
}

/**
 * Collapsible video content block. Delegates playback to VideoPlayer
 * (lazily imported). Fires `onFirstVisible` once on first expand so
 * the parent can log a single "video viewed" event.
 */
export default function VideoBlock({
  index,
  lessonId,
  courseId,
  title,
  src,
  videoTitle,
  chapters,
  captions,
  audioDescriptionSrc,
  preventSkipping,
  description,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
  onFirstVisible,
  onWatchProgress,
  onDurationDetected,
}: VideoBlockProps) {
  const firedVisible = React.useRef(false);

  React.useEffect(() => {
    if (!isCollapsed && !firedVisible.current) {
      firedVisible.current = true;
      onFirstVisible?.();
    }
  }, [isCollapsed, onFirstVisible]);

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
      {title && (
        <div
          className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
                Video
              </span>
              <span className="truncate">{title}</span>
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ContentProgressCheckbox isComplete={isComplete} onToggle={onToggleComplete} />
              <BookmarkButton
                type="lesson_content"
                id={lessonId}
                size="sm"
                className="text-white/50 hover:text-white/80"
                metadata={{ content_type: 'video', content_title: title, content_index: index }}
              />
              <div className="p-1 rounded hover:bg-white/10 transition-colors">
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-white/50" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-white/50" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        <div className="p-4 sm:p-6">
          <VideoPlayer
            src={src}
            title={videoTitle || 'Video Content'}
            lessonId={lessonId}
            contentIndex={index}
            chapters={chapters}
            captions={captions}
            audioDescriptionSrc={audioDescriptionSrc}
            preventSkipping={preventSkipping}
            courseId={courseId}
            onDurationDetected={onDurationDetected}
            onWatchProgress={onWatchProgress}
          />
          {description && (
            <div className="mt-4 pl-4 border-l-2 border-slate-200">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Notes
              </h4>
              <div
                className="prose prose-sm max-w-none text-slate-600 prose-headings:text-slate-800 prose-headings:font-medium"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
