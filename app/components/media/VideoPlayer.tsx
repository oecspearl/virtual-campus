"use client";

import React from 'react';
import VideoNotesPanel from '@/app/components/media/VideoNotesPanel';
import ChapterSidebar, { type VideoChapter } from '@/app/components/media/video/ChapterSidebar';
import EmbedPlayer from '@/app/components/media/video/EmbedPlayer';
import SpeedMenu, { SPEED_OPTIONS } from '@/app/components/media/video/SpeedMenu';
import CaptionMenu from '@/app/components/media/video/CaptionMenu';
import { formatTime, getStorageKey, calcPercentWatched, isYouTubeUrl, isVimeoUrl } from '@/lib/video/utils';

export type { VideoChapter };

export interface VideoCaption {
  src: string;        // URL to VTT/SRT file
  srclang: string;    // e.g. 'en'
  label: string;      // e.g. 'English'
  default?: boolean;
}

interface VideoPlayerProps {
  src: string;
  title?: string;
  lessonId?: string;
  contentIndex?: number;
  chapters?: VideoChapter[];
  captions?: VideoCaption[];
  audioDescriptionSrc?: string;
  preventSkipping?: boolean;
  onDurationDetected?: (duration: number) => void;
  onWatchProgress?: (data: {
    currentTime: number;
    duration: number;
    percentWatched: number;
    totalWatchTime: number;
    segments: [number, number][];
  }) => void;
  onTimestampBookmark?: (time: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
  showNotes?: boolean;
  courseId?: string;
  onSeekRef?: React.MutableRefObject<((time: number) => void) | null>;
}

export default function VideoPlayer({
  src,
  title,
  lessonId,
  contentIndex,
  chapters = [],
  captions = [],
  audioDescriptionSrc,
  preventSkipping = false,
  onDurationDetected,
  onWatchProgress,
  onTimestampBookmark,
  onTimeUpdate,
  showNotes = false,
  courseId,
  onSeekRef,
}: VideoPlayerProps) {
  // YouTube/Vimeo: embed with iframe (seekable via URL update)
  if (isYouTubeUrl(src) || isVimeoUrl(src)) {
    return (
      <EmbedPlayer
        src={src}
        title={title}
        chapters={chapters || []}
        showNotes={showNotes}
        lessonId={lessonId}
        courseId={courseId}
        onSeekRef={onSeekRef}
      />
    );
  }

  // Self-hosted video: full custom player
  return (
    <SelfHostedPlayer
      src={src}
      title={title}
      lessonId={lessonId}
      contentIndex={contentIndex}
      chapters={chapters}
      captions={captions}
      audioDescriptionSrc={audioDescriptionSrc}
      preventSkipping={preventSkipping}
      onDurationDetected={onDurationDetected}
      onWatchProgress={onWatchProgress}
      onTimestampBookmark={onTimestampBookmark}
      onTimeUpdate={onTimeUpdate}
      showNotes={showNotes}
      courseId={courseId}
      onSeekRef={onSeekRef}
    />
  );
}


// ─── Self-Hosted Player ──────────────────────────────────────────────────────

function SelfHostedPlayer({
  src,
  title,
  lessonId,
  contentIndex,
  chapters,
  captions,
  audioDescriptionSrc,
  preventSkipping,
  onDurationDetected,
  onWatchProgress,
  onTimestampBookmark,
  onTimeUpdate,
  showNotes,
  courseId,
  onSeekRef,
}: Omit<VideoPlayerProps, 'src'> & { src: string }) {
  const [sidebarTab, setSidebarTab] = React.useState<'chapters' | 'notes'>('chapters');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const adAudioRef = React.useRef<HTMLAudioElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const segmentStartRef = React.useRef<number>(0);
  const totalWatchTimeRef = React.useRef<number>(0);
  const watchedSegmentsRef = React.useRef<[number, number][]>([]);
  const lastAllowedTimeRef = React.useRef<number>(0);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = React.useState(false);
  const [showCaptionMenu, setShowCaptionMenu] = React.useState(false);
  const [activeCaptionIdx, setActiveCaptionIdx] = React.useState<number | null>(null);
  const [adEnabled, setAdEnabled] = React.useState(false);
  const [buffered, setBuffered] = React.useState(0);
  const [dbCaptions, setDbCaptions] = React.useState<VideoCaption[]>([]);
  const hideControlsTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch captions from video_captions table (ensures captions work even if
  // the instructor didn't save them into the lesson content block)
  React.useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/accessibility/captions?lesson_id=${lessonId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const fetched: VideoCaption[] = (data.captions || [])
          .filter((c: any) => c.caption_url)
          .map((c: any) => ({
            src: c.caption_url,
            srclang: c.language?.length > 3
              ? ({ english: 'en', spanish: 'es', french: 'fr', german: 'de', portuguese: 'pt', italian: 'it', dutch: 'nl', russian: 'ru', chinese: 'zh', japanese: 'ja', korean: 'ko', arabic: 'ar', hindi: 'hi' } as Record<string, string>)[c.language?.toLowerCase()] || c.language
              : c.language || 'en',
            label: c.label || c.language || 'English',
            default: c.is_default || false,
          }));
        if (!cancelled && fetched.length > 0) setDbCaptions(fetched);
      } catch {
        // Silently fail — captions from props still work
      }
    })();
    return () => { cancelled = true; };
  }, [lessonId]);

  // Merge prop captions with DB captions (prop captions take priority)
  const mergedCaptions = React.useMemo(() => {
    // Start with prop captions that have a valid src
    const fromProps = (captions || []).filter(c => c.src);
    if (fromProps.length > 0) return fromProps;
    // Fall back to DB captions
    return dbCaptions;
  }, [captions, dbCaptions]);

  // Resume playback: load saved position
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const key = getStorageKey(src, lessonId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.time && parsed.time > 2) {
        video.currentTime = parsed.time - 2; // back up 2 seconds
      }
      if (parsed.segments) {
        watchedSegmentsRef.current = parsed.segments;
      }
      if (parsed.totalWatchTime) {
        totalWatchTimeRef.current = parsed.totalWatchTime;
      }
    }
  }, [src, lessonId]);

  // Set default caption
  React.useEffect(() => {
    if (mergedCaptions && mergedCaptions.length > 0) {
      const defaultIdx = mergedCaptions.findIndex(c => c.default);
      if (defaultIdx >= 0) setActiveCaptionIdx(defaultIdx);
    }
  }, [mergedCaptions]);

  // Video event listeners
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      onDurationDetected?.(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Fire callback for parent components (discussions, notes)
      onTimeUpdate?.(video.currentTime);
      // Track furthest point reached for preventSkipping
      if (video.currentTime > lastAllowedTimeRef.current) {
        lastAllowedTimeRef.current = video.currentTime;
      }
      // Update buffered
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      segmentStartRef.current = video.currentTime;
    };

    const onPause = () => {
      setIsPlaying(false);
      // Record watched segment
      const segEnd = video.currentTime;
      const segStart = segmentStartRef.current;
      if (segEnd > segStart + 0.5) {
        watchedSegmentsRef.current.push([segStart, segEnd]);
        totalWatchTimeRef.current += (segEnd - segStart);
      }
      // Save progress to localStorage
      saveProgress(video);
      // Fire callback
      fireWatchProgress(video);
    };

    const onEnded = () => {
      setIsPlaying(false);
      const segEnd = video.currentTime;
      const segStart = segmentStartRef.current;
      if (segEnd > segStart + 0.5) {
        watchedSegmentsRef.current.push([segStart, segEnd]);
        totalWatchTimeRef.current += (segEnd - segStart);
      }
      saveProgress(video);
      fireWatchProgress(video);
    };

    const onSeeking = () => {
      if (preventSkipping && video.currentTime > lastAllowedTimeRef.current + 1) {
        video.currentTime = lastAllowedTimeRef.current;
      }
      // End previous segment on seek
      const segEnd = segmentStartRef.current;
      const now = video.currentTime;
      if (Math.abs(now - segEnd) > 1) {
        if (segEnd < now && isPlaying) {
          watchedSegmentsRef.current.push([segEnd, now]);
        }
        segmentStartRef.current = video.currentTime;
      }
    };

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('seeking', onSeeking);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('seeking', onSeeking);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, preventSkipping]);

  // Sync audio description track with video
  React.useEffect(() => {
    if (!adEnabled || !adAudioRef.current || !videoRef.current) return;
    const ad = adAudioRef.current;
    const video = videoRef.current;
    ad.currentTime = video.currentTime;
    ad.playbackRate = video.playbackRate;
    if (!video.paused) ad.play().catch(() => {});
    else ad.pause();
  }, [adEnabled, isPlaying, currentTime]);

  // Save progress to localStorage
  const saveProgress = (video: HTMLVideoElement) => {
    const key = getStorageKey(src, lessonId);
    localStorage.setItem(key, JSON.stringify({
      time: video.currentTime,
      duration: video.duration,
      segments: watchedSegmentsRef.current,
      totalWatchTime: totalWatchTimeRef.current,
      updatedAt: Date.now(),
    }));
  };

  const fireWatchProgress = (video: HTMLVideoElement) => {
    onWatchProgress?.({
      currentTime: video.currentTime,
      duration: video.duration,
      percentWatched: calcPercentWatched(watchedSegmentsRef.current, video.duration),
      totalWatchTime: totalWatchTimeRef.current,
      segments: watchedSegmentsRef.current,
    });
  };

  // Auto-save every 10 seconds while playing
  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        saveProgress(video);
      }
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, src, lessonId]);

  // ── Controls ──

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const newTime = pct * duration;
    if (preventSkipping && newTime > lastAllowedTimeRef.current + 1) {
      video.currentTime = lastAllowedTimeRef.current;
    } else {
      video.currentTime = newTime;
    }
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    if (adAudioRef.current) adAudioRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const v = parseFloat(e.target.value);
    video.volume = v;
    setVolume(v);
    if (v > 0 && video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const toggleCaption = (idx: number | null) => {
    setActiveCaptionIdx(idx);
    setShowCaptionMenu(false);
    const video = videoRef.current;
    if (!video) return;
    // Toggle text tracks
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = (i === idx) ? 'showing' : 'hidden';
    }
  };

  const seekTo = React.useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    if (preventSkipping && time > lastAllowedTimeRef.current + 1) return;
    video.currentTime = time;
  }, [preventSkipping]);

  // Expose seek function to parent via ref
  React.useEffect(() => {
    if (onSeekRef) onSeekRef.current = seekTo;
    return () => { if (onSeekRef) onSeekRef.current = null; };
  }, [seekTo, onSeekRef]);

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const video = videoRef.current;
    if (!video) return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (preventSkipping && video.currentTime + 5 > lastAllowedTimeRef.current + 1) break;
        video.currentTime = Math.min(duration, video.currentTime + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        setVolume(video.volume);
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        setVolume(video.volume);
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'c':
        e.preventDefault();
        if (mergedCaptions && mergedCaptions.length > 0) {
          toggleCaption(activeCaptionIdx === null ? 0 : null);
        }
        break;
      case ',':
        e.preventDefault();
        { const idx = SPEED_OPTIONS.indexOf(playbackRate);
          if (idx > 0) changeSpeed(SPEED_OPTIONS[idx - 1]);
        }
        break;
      case '.':
        e.preventDefault();
        { const idx = SPEED_OPTIONS.indexOf(playbackRate);
          if (idx < SPEED_OPTIONS.length - 1) changeSpeed(SPEED_OPTIONS[idx + 1]);
        }
        break;
      case 'b':
        e.preventDefault();
        onTimestampBookmark?.(video.currentTime);
        break;
    }
  };

  // Auto-hide controls (don't hide while a menu is open)
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        if (!showSpeedMenu && !showCaptionMenu) {
          setShowControls(false);
        }
      }, 3000);
    }
  };

  // Close menus on outside click (use refs to avoid closing when clicking inside)
  const speedMenuRef = React.useRef<HTMLDivElement>(null);
  const captionMenuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (speedMenuRef.current?.contains(e.target as Node)) return;
      if (captionMenuRef.current?.contains(e.target as Node)) return;
      setShowSpeedMenu(false);
      setShowCaptionMenu(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const watchedPct = calcPercentWatched(watchedSegmentsRef.current, duration);

  const sortedChapters = React.useMemo(
    () => [...(chapters || [])].sort((a, b) => a.time - b.time),
    [chapters]
  );

  const videoPlayer = (
    <div
      ref={containerRef}
      className="relative w-full max-w-full mx-auto group bg-black rounded-lg overflow-hidden"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label={`Video player: ${title || 'Video'}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black cursor-pointer"
        playsInline
        crossOrigin="anonymous"
        onClick={togglePlay}
        preload="metadata"
      >
        <source src={src} />
        {mergedCaptions?.map((cap, i) => (
          <track
            key={i}
            kind="captions"
            src={cap.src}
            srcLang={cap.srclang}
            label={cap.label}
            default={cap.default}
          />
        ))}
        Your browser does not support the video tag.
      </video>

      {/* Audio Description Track */}
      {audioDescriptionSrc && (
        <audio ref={adAudioRef} src={audioDescriptionSrc} preload="metadata" />
      )}

      {/* Play overlay when paused */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
          aria-label="Play video"
        >
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <div className="px-3 pt-8">
          <div
            className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/progress hover:h-2.5 transition-all"
            onClick={handleSeek}
            role="slider"
            aria-label="Video progress"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            tabIndex={0}
          >
            {/* Buffered */}
            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
            {/* Progress */}
            <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full" style={{ width: `${progressPct}%` }} />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-blue-500 rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `${progressPct}%`, transform: `translate(-50%, -50%)` }}
            />
            {/* Chapter markers */}
            {sortedChapters.map((ch, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-white/60 rounded-full"
                style={{ left: `${(ch.time / (duration || 1)) * 100}%` }}
                title={ch.title}
              />
            ))}
          </div>

          {/* Time + current chapter */}
          <div className="flex items-center justify-between mt-1 px-0.5">
            <span className="text-[11px] text-white/70 font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {sortedChapters.length > 0 && (
              <span className="text-[11px] text-white/50 truncate ml-2">
                {sortedChapters.reduce<string>((acc, ch) => (currentTime >= ch.time ? ch.title : acc), sortedChapters[0]?.title || '')}
              </span>
            )}
            {watchedPct > 0 && watchedPct < 100 && (
              <span className="text-[11px] text-blue-300/70 ml-2">{watchedPct}% watched</span>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 px-3 py-2 min-w-0">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="p-1.5 text-white hover:text-blue-300 transition-colors" aria-label={isPlaying ? 'Pause (k)' : 'Play (k)'}>
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          {/* Skip back 5s */}
          <button onClick={() => seekTo(Math.max(0, currentTime - 5))} className="p-1.5 text-white/70 hover:text-white transition-colors" aria-label="Back 5 seconds">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
          </button>

          {/* Skip forward 5s */}
          <button onClick={() => seekTo(Math.min(duration, currentTime + 5))} className="p-1.5 text-white/70 hover:text-white transition-colors" aria-label="Forward 5 seconds">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" /></svg>
          </button>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1 ml-1 min-w-0">
            <button onClick={toggleMute} className="p-1.5 text-white/70 hover:text-white transition-colors flex-shrink-0" aria-label={isMuted ? 'Unmute (m)' : 'Mute (m)'}>
              {isMuted || volume === 0 ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
              aria-label="Volume"
            />
          </div>
          {/* Mute-only button on mobile (no slider) */}
          <button onClick={toggleMute} className="sm:hidden p-1.5 text-white/70 hover:text-white transition-colors flex-shrink-0" aria-label={isMuted ? 'Unmute (m)' : 'Mute (m)'}>
            {isMuted || volume === 0 ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
            )}
          </button>

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* Timestamp bookmark */}
          {onTimestampBookmark && (
            <button
              onClick={() => onTimestampBookmark(currentTime)}
              className="p-1.5 text-white/70 hover:text-yellow-300 transition-colors"
              aria-label="Bookmark this moment (b)"
              title="Bookmark this moment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            </button>
          )}

          {/* Speed */}
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

          {/* Captions — always visible */}
          <CaptionMenu
            ref={captionMenuRef}
            captions={mergedCaptions}
            activeCaptionIdx={activeCaptionIdx}
            onToggleCaption={toggleCaption}
            open={showCaptionMenu}
            onToggle={() => {
              setShowCaptionMenu(!showCaptionMenu);
              setShowSpeedMenu(false);
            }}
          />

          {/* Audio Description */}
          {audioDescriptionSrc && (
            <button
              onClick={() => setAdEnabled(!adEnabled)}
              className={`p-1.5 transition-colors ${adEnabled ? 'text-blue-300' : 'text-white/70 hover:text-white'}`}
              aria-label={adEnabled ? 'Disable audio descriptions' : 'Enable audio descriptions'}
              title="Audio descriptions"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5.5 16h1.75l.87-2.5h3.76L12.75 16h1.75l-3.5-10h-2L5.5 16zm3.12-4L10 8.67 11.38 12H8.62z" /></svg>
            </button>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-1.5 text-white/70 hover:text-white transition-colors flex-shrink-0" aria-label={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}>
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts hint (shown on focus) */}
      <div className="sr-only">
        Space or K: play/pause. Left/Right: seek 5s. Up/Down: volume. F: fullscreen. M: mute. C: captions. B: bookmark. Comma/period: speed.
      </div>

      {/* Prevent skipping indicator */}
      {preventSkipping && (
        <div className="absolute top-3 right-3 bg-orange-500/80 text-white text-[10px] px-2 py-1 rounded-full">
          Sequential viewing required
        </div>
      )}
    </div>
  );

  const hasChapters = sortedChapters.length > 0;
  const hasSidebar = hasChapters || showNotes;

  if (!hasSidebar) return videoPlayer;

  return (
    <div className="w-full mx-auto max-w-full flex flex-col lg:flex-row gap-0 rounded-lg overflow-hidden border border-gray-200">
      <div className="lg:w-56 xl:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white max-h-48 lg:max-h-[500px] overflow-hidden flex flex-col">
        {/* Sidebar tabs when both chapters and notes are available */}
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
                <ChapterSidebar chapters={sortedChapters} onSeek={seekTo} currentTime={currentTime} />
              ) : (
                lessonId ? (
                  <VideoNotesPanel lessonId={lessonId} courseId={courseId} currentTime={currentTime} onSeek={seekTo} />
                ) : (
                  <div className="p-3 text-xs text-gray-400 text-center">Notes require a saved lesson</div>
                )
              )}
            </div>
          </>
        ) : hasChapters ? (
          <ChapterSidebar chapters={sortedChapters} onSeek={seekTo} currentTime={currentTime} />
        ) : showNotes && lessonId ? (
          <VideoNotesPanel lessonId={lessonId} courseId={courseId} currentTime={currentTime} onSeek={seekTo} />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        {videoPlayer}
      </div>
    </div>
  );
}
