'use client';

import React from 'react';
import { type VideoChapter } from './ChapterSidebar';
import VideoSidebar from './VideoSidebar';
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
 * Thin iframe wrapper for YouTube and Vimeo videos. The sidebar layout
 * (chapters + notes) is delegated to the shared VideoSidebar component.
 * Supports programmatic seeking via `onSeekRef` — the parent sets
 * `.current` to a seek function that rebuilds the embed URL with a
 * start time.
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

  return (
    <VideoSidebar
      chapters={chapters}
      showNotes={showNotes}
      lessonId={lessonId}
      courseId={courseId}
      currentTime={seekTime}
      onSeek={handleSeek}
    >
      {videoEl}
    </VideoSidebar>
  );
}
