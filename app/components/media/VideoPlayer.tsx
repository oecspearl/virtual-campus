"use client";

import React from 'react';
import { type VideoChapter } from '@/app/components/media/video/ChapterSidebar';
import EmbedPlayer from '@/app/components/media/video/EmbedPlayer';
import { SPEED_OPTIONS } from '@/app/components/media/video/SpeedMenu';
import VideoSidebar from '@/app/components/media/video/VideoSidebar';
import PlayOverlay from '@/app/components/media/video/PlayOverlay';
import ProgressBar from '@/app/components/media/video/ProgressBar';
import ControlsOverlay from '@/app/components/media/video/ControlsOverlay';
import { getStorageKey, calcPercentWatched, isYouTubeUrl, isVimeoUrl } from '@/lib/video/utils';
import { handleVideoKeyDown } from '@/lib/video/keyboard-shortcuts';

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

  const handleScrub = (fraction: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const newTime = fraction * duration;
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

  // Keyboard controls — delegated to lib/video/keyboard-shortcuts so the
  // shortcut map is independently testable.
  const handleKeyDown = (e: React.KeyboardEvent) =>
    handleVideoKeyDown(e, {
      videoRef,
      duration,
      preventSkipping,
      lastAllowedTimeRef,
      playbackRate,
      speedOptions: SPEED_OPTIONS,
      hasCaptions: mergedCaptions.length > 0,
      activeCaptionIdx,
      togglePlay,
      toggleFullscreen,
      toggleMute,
      toggleCaption,
      changeSpeed,
      setVolume,
      onTimestampBookmark,
    });

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
      {!isPlaying && <PlayOverlay onPlay={togglePlay} />}

      {/* Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          bufferedPct={bufferedPct}
          progressPct={progressPct}
          watchedPct={watchedPct}
          chapters={sortedChapters}
          onScrub={handleScrub}
        />

        {/* Control Buttons */}
        <ControlsOverlay
          isPlaying={isPlaying}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playbackRate={playbackRate}
          captions={mergedCaptions}
          activeCaptionIdx={activeCaptionIdx}
          audioDescriptionSrc={audioDescriptionSrc}
          adEnabled={adEnabled}
          togglePlay={togglePlay}
          toggleMute={toggleMute}
          toggleFullscreen={toggleFullscreen}
          seekTo={seekTo}
          changeSpeed={changeSpeed}
          toggleCaption={toggleCaption}
          onVolumeChange={handleVolumeChange}
          onToggleAd={() => setAdEnabled(!adEnabled)}
          onTimestampBookmark={onTimestampBookmark}
          showSpeedMenu={showSpeedMenu}
          showCaptionMenu={showCaptionMenu}
          setShowSpeedMenu={setShowSpeedMenu}
          setShowCaptionMenu={setShowCaptionMenu}
          speedMenuRef={speedMenuRef}
          captionMenuRef={captionMenuRef}
        />
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

  return (
    <VideoSidebar
      chapters={sortedChapters}
      showNotes={showNotes}
      lessonId={lessonId}
      courseId={courseId}
      currentTime={currentTime}
      onSeek={seekTo}
      maxHeightClass="lg:max-h-[500px]"
    >
      {videoPlayer}
    </VideoSidebar>
  );
}
