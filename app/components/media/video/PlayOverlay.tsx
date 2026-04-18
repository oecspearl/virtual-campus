'use client';

import React from 'react';

interface PlayOverlayProps {
  /** Called when the user clicks anywhere on the overlay. */
  onPlay: () => void;
}

/**
 * Center-of-video play overlay shown when the video is paused. Covers the
 * video surface so that a single click anywhere on the player starts
 * playback. The parent is responsible for conditionally rendering this
 * (typically `{!isPlaying && <PlayOverlay onPlay={togglePlay} />}`).
 */
export default function PlayOverlay({ onPlay }: PlayOverlayProps) {
  return (
    <button
      onClick={onPlay}
      className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
      aria-label="Play video"
    >
      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
        <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  );
}
