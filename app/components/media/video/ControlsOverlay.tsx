'use client';

import React from 'react';
import SpeedMenu from './SpeedMenu';
import CaptionMenu, { type VideoCaption } from './CaptionMenu';

interface ControlsOverlayProps {
  // Playback state
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;

  // Captions / audio description
  captions: VideoCaption[];
  activeCaptionIdx: number | null;
  audioDescriptionSrc?: string;
  adEnabled: boolean;

  // Actions
  togglePlay: () => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  seekTo: (time: number) => void;
  changeSpeed: (speed: number) => void;
  toggleCaption: (idx: number | null) => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleAd: () => void;
  onTimestampBookmark?: (time: number) => void;

  // Menu state — lifted to parent so auto-hide logic can see "any menu open"
  showSpeedMenu: boolean;
  showCaptionMenu: boolean;
  setShowSpeedMenu: (v: boolean) => void;
  setShowCaptionMenu: (v: boolean) => void;
  speedMenuRef: React.RefObject<HTMLDivElement | null>;
  captionMenuRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Bottom control bar for the self-hosted video player. Contains:
 *   play/pause · skip ±5s · volume · bookmark · speed · captions ·
 *   audio description · fullscreen
 *
 * The speed/caption dropdowns are delegated to the extracted SpeedMenu
 * and CaptionMenu components. Their open-state and outside-click refs
 * are owned by the parent (VideoPlayer) because the control bar's
 * auto-hide logic needs to know "is any menu currently open" to avoid
 * hiding mid-interaction.
 */
export default function ControlsOverlay(props: ControlsOverlayProps) {
  const {
    isPlaying,
    isMuted,
    isFullscreen,
    currentTime,
    duration,
    volume,
    playbackRate,
    captions,
    activeCaptionIdx,
    audioDescriptionSrc,
    adEnabled,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    seekTo,
    changeSpeed,
    toggleCaption,
    onVolumeChange,
    onToggleAd,
    onTimestampBookmark,
    showSpeedMenu,
    showCaptionMenu,
    setShowSpeedMenu,
    setShowCaptionMenu,
    speedMenuRef,
    captionMenuRef,
  } = props;

  return (
    <div className="flex items-center gap-1 sm:gap-2 px-3 py-2 min-w-0">
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="p-1.5 text-white hover:text-blue-300 transition-colors"
        aria-label={isPlaying ? 'Pause (k)' : 'Play (k)'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Skip back 5s */}
      <button
        onClick={() => seekTo(Math.max(0, currentTime - 5))}
        className="p-1.5 text-white/70 hover:text-white transition-colors"
        aria-label="Back 5 seconds"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
          />
        </svg>
      </button>

      {/* Skip forward 5s */}
      <button
        onClick={() => seekTo(Math.min(duration, currentTime + 5))}
        className="p-1.5 text-white/70 hover:text-white transition-colors"
        aria-label="Forward 5 seconds"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
          />
        </svg>
      </button>

      {/* Volume — slider on desktop, mute-only button on mobile */}
      <div className="hidden sm:flex items-center gap-1 ml-1 min-w-0">
        <button
          onClick={toggleMute}
          className="p-1.5 text-white/70 hover:text-white transition-colors flex-shrink-0"
          aria-label={isMuted ? 'Unmute (m)' : 'Mute (m)'}
        >
          {isMuted || volume === 0 ? <MutedIcon /> : <VolumeIcon />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={onVolumeChange}
          className="w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
          aria-label="Volume"
        />
      </div>
      <button
        onClick={toggleMute}
        className="sm:hidden p-1.5 text-white/70 hover:text-white transition-colors flex-shrink-0"
        aria-label={isMuted ? 'Unmute (m)' : 'Mute (m)'}
      >
        {isMuted || volume === 0 ? <MutedIcon /> : <VolumeIcon />}
      </button>

      {/* Spacer pushes remaining controls to the right */}
      <div className="flex-1 min-w-0" />

      {/* Timestamp bookmark */}
      {onTimestampBookmark && (
        <button
          onClick={() => onTimestampBookmark(currentTime)}
          className="p-1.5 text-white/70 hover:text-yellow-300 transition-colors"
          aria-label="Bookmark this moment (b)"
          title="Bookmark this moment"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>
      )}

      {/* Speed dropdown */}
      <SpeedMenu
        ref={speedMenuRef}
        playbackRate={playbackRate}
        onChangeSpeed={changeSpeed}
        open={showSpeedMenu}
        onToggle={() => {
          setShowSpeedMenu(!showSpeedMenu);
          setShowCaptionMenu(false);
        }}
      />

      {/* Captions dropdown */}
      <CaptionMenu
        ref={captionMenuRef}
        captions={captions}
        activeCaptionIdx={activeCaptionIdx}
        onToggleCaption={toggleCaption}
        open={showCaptionMenu}
        onToggle={() => {
          setShowCaptionMenu(!showCaptionMenu);
          setShowSpeedMenu(false);
        }}
      />

      {/* Audio description toggle */}
      {audioDescriptionSrc && (
        <button
          onClick={onToggleAd}
          className={`p-1.5 transition-colors ${
            adEnabled ? 'text-blue-300' : 'text-white/70 hover:text-white'
          }`}
          aria-label={adEnabled ? 'Disable audio descriptions' : 'Enable audio descriptions'}
          title="Audio descriptions"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5.5 16h1.75l.87-2.5h3.76L12.75 16h1.75l-3.5-10h-2L5.5 16zm3.12-4L10 8.67 11.38 12H8.62z" />
          </svg>
        </button>
      )}

      {/* Fullscreen */}
      <button
        onClick={toggleFullscreen}
        className="p-1.5 text-white/70 hover:text-white transition-colors flex-shrink-0"
        aria-label={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
      >
        {isFullscreen ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── Small icon subcomponents used in two places ──────────────────────────

function VolumeIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  );
}
