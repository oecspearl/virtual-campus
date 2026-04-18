import { describe, it, expect, vi } from 'vitest';
import type React from 'react';
import { handleVideoKeyDown, type KeyboardShortcutsOptions } from '../keyboard-shortcuts';

// ─── Test harness ───────────────────────────────────────────────────────────

type FakeVideo = {
  currentTime: number;
  volume: number;
};

function makeEvent(key: string): React.KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn();
  return { key, preventDefault } as unknown as React.KeyboardEvent & {
    preventDefault: ReturnType<typeof vi.fn>;
  };
}

function makeOpts(overrides: Partial<KeyboardShortcutsOptions> = {}, video: FakeVideo = { currentTime: 50, volume: 0.5 }): {
  opts: KeyboardShortcutsOptions;
  video: FakeVideo;
  callbacks: {
    togglePlay: ReturnType<typeof vi.fn>;
    toggleFullscreen: ReturnType<typeof vi.fn>;
    toggleMute: ReturnType<typeof vi.fn>;
    toggleCaption: ReturnType<typeof vi.fn>;
    changeSpeed: ReturnType<typeof vi.fn>;
    setVolume: ReturnType<typeof vi.fn>;
    onTimestampBookmark: ReturnType<typeof vi.fn>;
  };
} {
  const callbacks = {
    togglePlay: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleMute: vi.fn(),
    toggleCaption: vi.fn(),
    changeSpeed: vi.fn(),
    setVolume: vi.fn(),
    onTimestampBookmark: vi.fn(),
  };

  const opts: KeyboardShortcutsOptions = {
    videoRef: { current: video as unknown as HTMLVideoElement },
    duration: 300,
    preventSkipping: false,
    lastAllowedTimeRef: { current: 999 },
    playbackRate: 1,
    speedOptions: [0.5, 0.75, 1, 1.25, 1.5, 2],
    hasCaptions: false,
    activeCaptionIdx: null,
    ...callbacks,
    ...overrides,
  };

  return { opts, video, callbacks };
}

// ─── No-op cases ────────────────────────────────────────────────────────────

describe('handleVideoKeyDown — no-op', () => {
  it('does nothing when videoRef.current is null', () => {
    const { opts, callbacks } = makeOpts();
    opts.videoRef = { current: null };
    const e = makeEvent(' ');
    handleVideoKeyDown(e, opts);
    expect(callbacks.togglePlay).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('ignores unrelated keys', () => {
    const { opts, callbacks } = makeOpts();
    const e = makeEvent('z');
    handleVideoKeyDown(e, opts);
    expect(callbacks.togglePlay).not.toHaveBeenCalled();
    expect(callbacks.toggleMute).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

// ─── Play / pause ───────────────────────────────────────────────────────────

describe('handleVideoKeyDown — play/pause', () => {
  it('Space toggles play', () => {
    const { opts, callbacks } = makeOpts();
    const e = makeEvent(' ');
    handleVideoKeyDown(e, opts);
    expect(callbacks.togglePlay).toHaveBeenCalledTimes(1);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('k toggles play (YouTube convention)', () => {
    const { opts, callbacks } = makeOpts();
    handleVideoKeyDown(makeEvent('k'), opts);
    expect(callbacks.togglePlay).toHaveBeenCalledTimes(1);
  });
});

// ─── Seeking ────────────────────────────────────────────────────────────────

describe('handleVideoKeyDown — seeking', () => {
  it('ArrowLeft seeks -5s clamped at 0', () => {
    const video = { currentTime: 3, volume: 0.5 };
    const { opts } = makeOpts({}, video);
    handleVideoKeyDown(makeEvent('ArrowLeft'), opts);
    expect(video.currentTime).toBe(0); // Math.max(0, 3-5) = 0
  });

  it('ArrowRight seeks +5s clamped at duration', () => {
    const video = { currentTime: 298, volume: 0.5 };
    const { opts } = makeOpts({ duration: 300 }, video);
    handleVideoKeyDown(makeEvent('ArrowRight'), opts);
    expect(video.currentTime).toBe(300); // Math.min(300, 298+5) = 300
  });

  it('ArrowRight respects preventSkipping by not advancing past lastAllowed + 1', () => {
    const video = { currentTime: 100, volume: 0.5 };
    const { opts } = makeOpts({
      preventSkipping: true,
      lastAllowedTimeRef: { current: 100 },
    }, video);
    // attempt +5s but lastAllowed is 100 so new time (105) > 100+1 → blocked
    handleVideoKeyDown(makeEvent('ArrowRight'), opts);
    expect(video.currentTime).toBe(100);
  });

  it('ArrowRight does advance when within the watched+1s window', () => {
    const video = { currentTime: 100, volume: 0.5 };
    const { opts } = makeOpts({
      preventSkipping: true,
      lastAllowedTimeRef: { current: 110 },
    }, video);
    handleVideoKeyDown(makeEvent('ArrowRight'), opts);
    expect(video.currentTime).toBe(105);
  });
});

// ─── Volume ─────────────────────────────────────────────────────────────────

describe('handleVideoKeyDown — volume', () => {
  it('ArrowUp increases volume by 0.1 and reports via setVolume', () => {
    const video = { currentTime: 0, volume: 0.5 };
    const { opts, callbacks } = makeOpts({}, video);
    handleVideoKeyDown(makeEvent('ArrowUp'), opts);
    expect(video.volume).toBeCloseTo(0.6);
    expect(callbacks.setVolume).toHaveBeenCalledWith(video.volume);
  });

  it('ArrowUp caps at 1.0', () => {
    const video = { currentTime: 0, volume: 0.95 };
    const { opts } = makeOpts({}, video);
    handleVideoKeyDown(makeEvent('ArrowUp'), opts);
    expect(video.volume).toBe(1);
  });

  it('ArrowDown decreases volume by 0.1', () => {
    const video = { currentTime: 0, volume: 0.5 };
    const { opts } = makeOpts({}, video);
    handleVideoKeyDown(makeEvent('ArrowDown'), opts);
    expect(video.volume).toBeCloseTo(0.4);
  });

  it('ArrowDown clamps at 0', () => {
    const video = { currentTime: 0, volume: 0.05 };
    const { opts } = makeOpts({}, video);
    handleVideoKeyDown(makeEvent('ArrowDown'), opts);
    expect(video.volume).toBe(0);
  });
});

// ─── Toggle keys ────────────────────────────────────────────────────────────

describe('handleVideoKeyDown — toggles', () => {
  it('f toggles fullscreen', () => {
    const { opts, callbacks } = makeOpts();
    handleVideoKeyDown(makeEvent('f'), opts);
    expect(callbacks.toggleFullscreen).toHaveBeenCalled();
  });

  it('m toggles mute', () => {
    const { opts, callbacks } = makeOpts();
    handleVideoKeyDown(makeEvent('m'), opts);
    expect(callbacks.toggleMute).toHaveBeenCalled();
  });
});

// ─── Captions ───────────────────────────────────────────────────────────────

describe('handleVideoKeyDown — c (captions)', () => {
  it('does nothing when there are no captions', () => {
    const { opts, callbacks } = makeOpts({ hasCaptions: false });
    handleVideoKeyDown(makeEvent('c'), opts);
    expect(callbacks.toggleCaption).not.toHaveBeenCalled();
  });

  it('turns captions on (index 0) when currently off', () => {
    const { opts, callbacks } = makeOpts({ hasCaptions: true, activeCaptionIdx: null });
    handleVideoKeyDown(makeEvent('c'), opts);
    expect(callbacks.toggleCaption).toHaveBeenCalledWith(0);
  });

  it('turns captions off when currently on', () => {
    const { opts, callbacks } = makeOpts({ hasCaptions: true, activeCaptionIdx: 0 });
    handleVideoKeyDown(makeEvent('c'), opts);
    expect(callbacks.toggleCaption).toHaveBeenCalledWith(null);
  });
});

// ─── Speed stepping ─────────────────────────────────────────────────────────

describe('handleVideoKeyDown — speed stepping', () => {
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

  it(', steps speed down one notch', () => {
    const { opts, callbacks } = makeOpts({ speedOptions: SPEEDS, playbackRate: 1.5 });
    handleVideoKeyDown(makeEvent(','), opts);
    expect(callbacks.changeSpeed).toHaveBeenCalledWith(1.25);
  });

  it('. steps speed up one notch', () => {
    const { opts, callbacks } = makeOpts({ speedOptions: SPEEDS, playbackRate: 1 });
    handleVideoKeyDown(makeEvent('.'), opts);
    expect(callbacks.changeSpeed).toHaveBeenCalledWith(1.25);
  });

  it(', at the slowest speed is a no-op', () => {
    const { opts, callbacks } = makeOpts({ speedOptions: SPEEDS, playbackRate: 0.5 });
    handleVideoKeyDown(makeEvent(','), opts);
    expect(callbacks.changeSpeed).not.toHaveBeenCalled();
  });

  it('. at the fastest speed is a no-op', () => {
    const { opts, callbacks } = makeOpts({ speedOptions: SPEEDS, playbackRate: 2 });
    handleVideoKeyDown(makeEvent('.'), opts);
    expect(callbacks.changeSpeed).not.toHaveBeenCalled();
  });
});

// ─── Bookmark ───────────────────────────────────────────────────────────────

describe('handleVideoKeyDown — b (bookmark)', () => {
  it('calls onTimestampBookmark with the current time', () => {
    const video = { currentTime: 137, volume: 0.5 };
    const { opts, callbacks } = makeOpts({}, video);
    handleVideoKeyDown(makeEvent('b'), opts);
    expect(callbacks.onTimestampBookmark).toHaveBeenCalledWith(137);
  });

  it('tolerates missing onTimestampBookmark callback', () => {
    const video = { currentTime: 137, volume: 0.5 };
    const { opts } = makeOpts({}, video);
    opts.onTimestampBookmark = undefined;
    expect(() => handleVideoKeyDown(makeEvent('b'), opts)).not.toThrow();
  });
});
