'use client';

import React from 'react';
import VideoNotesPanel from '@/app/components/media/VideoNotesPanel';
import ChapterSidebar, { type VideoChapter } from './ChapterSidebar';
import { getEmbedUrl, isYouTubeUrl, isVimeoUrl } from '@/lib/video/utils';

interface EmbedPlayerProps {
  src: string;
  title?: string;
  chapters?: VideoChapter[];
  showNotes?: boolean;
  lessonId?: string;
  courseId?: string;
  onSeekRef?: React.MutableRefObject<((time: number) => void) | null>;
}

/**
 * Thin iframe wrapper for YouTube and Vimeo videos, with an optional
 * sidebar that shows chapters and/or a notes panel. Supports programmatic
 * seeking via `onSeekRef` — the parent sets `.current` to a seek function
 * that rebuilds the embed URL with a start time.
 */
export default function EmbedPlayer({
  src,
  title,
  chapters = [],
  showNotes = false,
  lessonId,
  courseId,
  onSeekRef,
}: EmbedPlayerProps) {
  const isYouTube = isYouTubeUrl(src);
  const isVimeo = isVimeoUrl(src);

  const [embedUrl, setEmbedUrl] = React.useState(() => getEmbedUrl(src));
  const [seekTime, setSeekTime] = React.useState(0);
  const [sidebarTab, setSidebarTab] = React.useState<'chapters' | 'notes'>('chapters');

  const handleSeek = React.useCallback(
    (time: number) => {
      setSeekTime(time);
      const base = getEmbedUrl(src);
      if (isYouTube) {
        const separator = base.includes('?') ? '&' : '?';
        setEmbedUrl(`${base}${separator}start=${Math.round(time)}&autoplay=1&enablejsapi=1`);
      } else if (isVimeo) {
        setEmbedUrl(`${base}#t=${Math.round(time)}s`);
      }
    },
    [src, isYouTube, isVimeo]
  );

  // Expose the seek function to the parent via ref.
  React.useEffect(() => {
    if (onSeekRef) onSeekRef.current = handleSeek;
    return () => {
      if (onSeekRef) onSeekRef.current = null;
    };
  }, [handleSeek, onSeekRef]);

  const videoEl = (
    <div className="relative w-full">
      <div className="relative rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
        <iframe
          key={embedUrl}
          src={embedUrl}
          title={title || 'Video'}
          className="absolute left-0 top-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          style={{ minHeight: '200px' }}
        />
      </div>
    </div>
  );

  const hasChapters = chapters.length > 0;
  const hasSidebar = hasChapters || showNotes;

  if (!hasSidebar) {
    return <div className="w-full mx-auto max-w-full">{videoEl}</div>;
  }

  return (
    <div className="w-full mx-auto max-w-full flex flex-col lg:flex-row gap-0 rounded-lg overflow-hidden border border-gray-200">
      <div className="lg:w-56 xl:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white max-h-48 lg:max-h-[400px] overflow-hidden flex flex-col">
        {hasChapters && showNotes ? (
          <>
            <div className="flex border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setSidebarTab('chapters')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === 'chapters'
                    ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Chapters
              </button>
              <button
                onClick={() => setSidebarTab('notes')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === 'notes'
                    ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Notes
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {sidebarTab === 'chapters' ? (
                <ChapterSidebar chapters={chapters} onSeek={handleSeek} currentTime={seekTime} />
              ) : lessonId ? (
                <VideoNotesPanel
                  lessonId={lessonId}
                  courseId={courseId}
                  currentTime={seekTime}
                  onSeek={handleSeek}
                />
              ) : (
                <div className="p-3 text-xs text-gray-400 text-center">
                  Notes require a saved lesson
                </div>
              )}
            </div>
          </>
        ) : hasChapters ? (
          <ChapterSidebar chapters={chapters} onSeek={handleSeek} currentTime={seekTime} />
        ) : showNotes && lessonId ? (
          <VideoNotesPanel
            lessonId={lessonId}
            courseId={courseId}
            currentTime={seekTime}
            onSeek={handleSeek}
          />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">{videoEl}</div>
    </div>
  );
}
