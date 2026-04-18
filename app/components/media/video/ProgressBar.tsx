'use client';

import React from 'react';
import { type VideoChapter } from './ChapterSidebar';
import { formatTime } from '@/lib/video/utils';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  /** Percentage of video that has been buffered (0-100). */
  bufferedPct: number;
  /** Percentage of playhead along the track (0-100). */
  progressPct: number;
  /**
   * Percentage of video actually watched so far (0-100). When in range
   * (0, 100) a small "X% watched" badge appears next to the time readout.
   */
  watchedPct: number;
  /** Chapters to show as vertical tick marks on the track. */
  chapters: VideoChapter[];
  /**
   * Called when the user clicks the scrub bar. Receives the fractional
   * position (0..1) along the bar, not the absolute time — the parent
   * decides how to apply it (e.g. to respect preventSkipping).
   */
  onScrub: (fraction: number) => void;
}

/**
 * Video scrub bar: buffered region + progress + thumb + chapter markers,
 * plus the time / current-chapter / watched-% readout beneath. Click
 * anywhere on the bar to seek; the parent maps the click fraction to an
 * actual seek command.
 */
export default function ProgressBar({
  currentTime,
  duration,
  bufferedPct,
  progressPct,
  watchedPct,
  chapters,
  onScrub,
}: ProgressBarProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onScrub(fraction);
  };

  const currentChapterTitle =
    chapters.length > 0
      ? chapters.reduce<string>(
          (acc, ch) => (currentTime >= ch.time ? ch.title : acc),
          chapters[0]?.title || ''
        )
      : '';

  return (
    <div className="px-3 pt-8">
      <div
        className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/progress hover:h-2.5 transition-all"
        onClick={handleClick}
        role="slider"
        aria-label="Video progress"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        tabIndex={0}
      >
        {/* Buffered */}
        <div
          className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
          style={{ width: `${bufferedPct}%` }}
        />
        {/* Progress */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-blue-500 rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity"
          style={{ left: `${progressPct}%`, transform: `translate(-50%, -50%)` }}
        />
        {/* Chapter markers */}
        {chapters.map((ch, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-white/60 rounded-full"
            style={{ left: `${(ch.time / (duration || 1)) * 100}%` }}
            title={ch.title}
          />
        ))}
      </div>

      {/* Time + current chapter + watched percentage */}
      <div className="flex items-center justify-between mt-1 px-0.5">
        <span className="text-[11px] text-white/70 font-mono tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        {currentChapterTitle && (
          <span className="text-[11px] text-white/50 truncate ml-2">{currentChapterTitle}</span>
        )}
        {watchedPct > 0 && watchedPct < 100 && (
          <span className="text-[11px] text-blue-300/70 ml-2">{watchedPct}% watched</span>
        )}
      </div>
    </div>
  );
}
