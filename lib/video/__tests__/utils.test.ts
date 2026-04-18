import { describe, it, expect } from 'vitest';
import {
  formatTime,
  getStorageKey,
  calcPercentWatched,
  isYouTubeUrl,
  isVimeoUrl,
  getEmbedUrl,
} from '../utils';

describe('formatTime', () => {
  it('formats under a minute', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3599)).toBe('59:59');
  });

  it('formats hours when over an hour', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7325)).toBe('2:02:05');
  });

  it('returns 0:00 for negative or non-finite input', () => {
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('truncates fractional seconds (does not round)', () => {
    expect(formatTime(59.9)).toBe('0:59');
    expect(formatTime(60.5)).toBe('1:00');
  });
});

describe('getStorageKey', () => {
  it('returns a stable key for the same input', () => {
    expect(getStorageKey('https://a.com/video.mp4')).toBe(getStorageKey('https://a.com/video.mp4'));
  });

  it('differentiates by lessonId when provided', () => {
    const sameSrc = 'https://a.com/video.mp4';
    expect(getStorageKey(sameSrc, 'lesson-1')).not.toBe(getStorageKey(sameSrc, 'lesson-2'));
  });

  it('starts with the vc-video-resume prefix', () => {
    expect(getStorageKey('anything')).toMatch(/^vc-video-resume-/);
  });

  it('has bounded length (prefix + 32-char hash)', () => {
    const longSrc = 'https://example.com/' + 'a'.repeat(500);
    const key = getStorageKey(longSrc);
    expect(key.length).toBeLessThanOrEqual('vc-video-resume-'.length + 32);
  });
});

describe('calcPercentWatched', () => {
  it('returns 0 when no segments have been tracked', () => {
    expect(calcPercentWatched([], 100)).toBe(0);
  });

  it('returns 0 when duration is zero or negative', () => {
    expect(calcPercentWatched([[0, 50]], 0)).toBe(0);
    expect(calcPercentWatched([[0, 50]], -10)).toBe(0);
  });

  it('handles a single segment', () => {
    expect(calcPercentWatched([[0, 50]], 100)).toBe(50);
  });

  it('sums multiple non-overlapping segments', () => {
    expect(calcPercentWatched([[0, 25], [50, 75]], 100)).toBe(50);
  });

  it('merges overlapping segments instead of double-counting', () => {
    expect(calcPercentWatched([[0, 50], [25, 75]], 100)).toBe(75);
  });

  it('merges adjacent segments correctly', () => {
    expect(calcPercentWatched([[0, 50], [50, 100]], 100)).toBe(100);
  });

  it('caps at 100% even with pathological inputs', () => {
    expect(calcPercentWatched([[0, 200]], 100)).toBe(100);
  });

  it('does not mutate the caller-supplied segments array', () => {
    const input: [number, number][] = [[10, 20], [0, 5]];
    const snapshot = input.map((s) => [...s] as [number, number]);
    calcPercentWatched(input, 100);
    expect(input).toEqual(snapshot);
  });
});

describe('isYouTubeUrl / isVimeoUrl', () => {
  it('detects YouTube', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=abc12345678')).toBe(true);
    expect(isYouTubeUrl('https://youtu.be/abc12345678')).toBe(true);
    expect(isYouTubeUrl('https://www.vimeo.com/123')).toBe(false);
  });

  it('detects Vimeo', () => {
    expect(isVimeoUrl('https://vimeo.com/123456789')).toBe(true);
    expect(isVimeoUrl('https://www.youtube.com/watch?v=a')).toBe(false);
  });
});

describe('getEmbedUrl', () => {
  it('converts a standard YouTube watch URL to embed form', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=abc12345678')).toBe(
      'https://www.youtube.com/embed/abc12345678'
    );
  });

  it('converts a youtu.be short URL to embed form', () => {
    expect(getEmbedUrl('https://youtu.be/abc12345678')).toBe(
      'https://www.youtube.com/embed/abc12345678'
    );
  });

  it('converts a Vimeo URL to player.vimeo.com embed form', () => {
    expect(getEmbedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789'
    );
  });

  it('returns non-YouTube / non-Vimeo URLs unchanged', () => {
    const url = 'https://example.com/my-video.mp4';
    expect(getEmbedUrl(url)).toBe(url);
  });
});
