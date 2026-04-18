/**
 * Keyboard shortcut handler for the self-hosted video player.
 *
 * Extracted from VideoPlayer so the shortcut map is independently
 * testable — invoke with a synthetic React KeyboardEvent and assert on
 * the callbacks that fire.
 *
 * Recognised keys (matches typical video-player conventions):
 *   Space / k        — toggle play/pause
 *   Left / Right     — seek -5s / +5s
 *   Up / Down        — volume up / down by 0.1
 *   f                — toggle fullscreen
 *   m                — toggle mute
 *   c                — toggle captions (on → off, off → first track)
 *   , / .            — step speed down / up through SPEED_OPTIONS
 *   b                — bookmark the current timestamp
 */

import type React from 'react';

export interface KeyboardShortcutsOptions {
  /** Ref to the <video> element. */
  videoRef: React.RefObject<HTMLVideoElement | null>;

  /** Current video duration (seconds). */
  duration: number;

  /**
   * When true, forward seeking is capped at `lastAllowedTimeRef.current`
   * (prevents skipping ahead past what's been watched).
   */
  preventSkipping: boolean;
  /** Furthest timestamp the viewer has watched, used by preventSkipping. */
  lastAllowedTimeRef: React.MutableRefObject<number>;

  /** Current playback rate. */
  playbackRate: number;
  /** Ordered list of selectable speeds. `,` / `.` step through this. */
  speedOptions: readonly number[];

  /** Available caption tracks; the `c` key turns captions on/off. */
  hasCaptions: boolean;
  /** Currently active caption index (null = off). */
  activeCaptionIdx: number | null;

  // Callbacks
  togglePlay: () => void;
  toggleFullscreen: () => void;
  toggleMute: () => void;
  toggleCaption: (idx: number | null) => void;
  changeSpeed: (speed: number) => void;
  setVolume: (v: number) => void;
  onTimestampBookmark?: (time: number) => void;
}

/**
 * Handle a React keyboard event using the given shortcut options.
 * Call `e.preventDefault()` internally when a recognised key fires.
 *
 * Exported as a plain function (not a hook) so tests can pass a synthetic
 * event and assert on the callbacks directly.
 */
export function handleVideoKeyDown(
  e: React.KeyboardEvent,
  opts: KeyboardShortcutsOptions
): void {
  const video = opts.videoRef.current;
  if (!video) return;

  switch (e.key) {
    case ' ':
    case 'k':
      e.preventDefault();
      opts.togglePlay();
      break;

    case 'ArrowLeft':
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
      break;

    case 'ArrowRight':
      e.preventDefault();
      if (opts.preventSkipping && video.currentTime + 5 > opts.lastAllowedTimeRef.current + 1) break;
      video.currentTime = Math.min(opts.duration, video.currentTime + 5);
      break;

    case 'ArrowUp':
      e.preventDefault();
      video.volume = Math.min(1, video.volume + 0.1);
      opts.setVolume(video.volume);
      break;

    case 'ArrowDown':
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.1);
      opts.setVolume(video.volume);
      break;

    case 'f':
      e.preventDefault();
      opts.toggleFullscreen();
      break;

    case 'm':
      e.preventDefault();
      opts.toggleMute();
      break;

    case 'c':
      e.preventDefault();
      if (opts.hasCaptions) {
        opts.toggleCaption(opts.activeCaptionIdx === null ? 0 : null);
      }
      break;

    case ',': {
      e.preventDefault();
      const idx = opts.speedOptions.indexOf(opts.playbackRate);
      if (idx > 0) opts.changeSpeed(opts.speedOptions[idx - 1]);
      break;
    }

    case '.': {
      e.preventDefault();
      const idx = opts.speedOptions.indexOf(opts.playbackRate);
      if (idx < opts.speedOptions.length - 1) opts.changeSpeed(opts.speedOptions[idx + 1]);
      break;
    }

    case 'b':
      e.preventDefault();
      opts.onTimestampBookmark?.(video.currentTime);
      break;
  }
}
