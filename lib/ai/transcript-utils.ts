/**
 * Shared transcript parsing utilities for VTT/SRT caption files.
 * Used by both the AI Tutor context endpoint and the video-chapters endpoint.
 */

export interface TranscriptEntry {
  time: number;
  text: string;
}

/**
 * Parse a VTT or SRT transcript into timestamped text entries.
 */
export function parseTranscript(raw: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  // Remove BOM and WEBVTT header
  const cleaned = raw.replace(/^\uFEFF/, '').replace(/^WEBVTT.*\n\n?/i, '');
  // Split into cue blocks (separated by blank lines)
  const blocks = cleaned.split(/\n\s*\n/).filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    // Find the timestamp line (contains -->)
    const tsLineIdx = lines.findIndex(l => l.includes('-->'));
    if (tsLineIdx < 0) continue;

    const tsLine = lines[tsLineIdx];
    const match = tsLine.match(/(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/);
    if (!match) continue;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = parseInt(match[2]);
    const seconds = parseInt(match[3]);
    const timeInSeconds = hours * 3600 + minutes * 60 + seconds;

    // Text is everything after the timestamp line
    const text = lines.slice(tsLineIdx + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (text) {
      entries.push({ time: timeInSeconds, text });
    }
  }

  return entries;
}

/**
 * Condense transcript entries into ~30-second chunks for LLM context.
 * Returns a compact timestamped string representation.
 */
export function condenseTranscript(entries: TranscriptEntry[]): string {
  if (entries.length === 0) return '';

  const chunks: string[] = [];
  let currentChunkStart = entries[0].time;
  let currentTexts: string[] = [];

  for (const entry of entries) {
    if (entry.time - currentChunkStart > 30 && currentTexts.length > 0) {
      const mins = Math.floor(currentChunkStart / 60);
      const secs = currentChunkStart % 60;
      chunks.push(`[${mins}:${secs.toString().padStart(2, '0')}] ${currentTexts.join(' ')}`);
      currentChunkStart = entry.time;
      currentTexts = [];
    }
    currentTexts.push(entry.text);
  }
  // Last chunk
  if (currentTexts.length > 0) {
    const mins = Math.floor(currentChunkStart / 60);
    const secs = currentChunkStart % 60;
    chunks.push(`[${mins}:${secs.toString().padStart(2, '0')}] ${currentTexts.join(' ')}`);
  }

  return chunks.join('\n');
}

/**
 * Extract plain text from a full transcript (no timestamps).
 * Useful for concept extraction where timing isn't needed.
 */
export function transcriptToPlainText(entries: TranscriptEntry[]): string {
  return entries.map(e => e.text).join(' ');
}
