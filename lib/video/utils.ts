/**
 * Pure, framework-agnostic helpers used by the VideoPlayer component and
 * its sub-components. Keeping these in a separate module means they can be
 * unit-tested without pulling in React.
 */

/**
 * Format a number of seconds as `M:SS` or `H:MM:SS`.
 * Returns `'0:00'` for negative or non-finite input.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Generate a stable localStorage key for resume-position tracking.
 * Uses `lessonId` when provided so that the same video URL in different
 * lessons tracks independently.
 */
export function getStorageKey(src: string, lessonId?: string): string {
  const id = lessonId || src;
  const safe = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(id))) : Buffer.from(id, 'utf-8').toString('base64');
  return `vc-video-resume-${safe.slice(0, 32)}`;
}

/**
 * Calculate the percentage of a video actually watched, given a list of
 * `[start, end]` watched segments (in seconds). Overlapping segments are
 * merged before summation so repeat views of the same segment don't inflate
 * the total.
 *
 * Returns 0 when duration is zero/negative or no segments have been tracked.
 */
export function calcPercentWatched(segments: [number, number][], duration: number): number {
  if (duration <= 0 || segments.length === 0) return 0;

  const sorted = [...segments].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      merged.push([sorted[i][0], sorted[i][1]]);
    }
  }
  const watched = merged.reduce((sum, [a, b]) => sum + (b - a), 0);
  return Math.min(100, Math.round((watched / duration) * 100));
}

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const VIMEO_REGEX = /vimeo\.com\/(\d+)/;

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

export function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/.test(url);
}

/**
 * Convert a YouTube or Vimeo page URL into an embeddable iframe URL.
 * Returns the original URL unchanged if no embed transformation applies.
 */
export function getEmbedUrl(url: string): string {
  if (isYouTubeUrl(url)) {
    const match = url.match(YOUTUBE_REGEX);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (isVimeoUrl(url)) {
    const match = url.match(VIMEO_REGEX);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;
  }
  return url;
}
