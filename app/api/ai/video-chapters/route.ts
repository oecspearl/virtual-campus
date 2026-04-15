import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

export const maxDuration = 30;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Parse VTT/SRT transcript into text with timestamps
function parseTranscript(raw: string): { time: number; text: string }[] {
  const entries: { time: number; text: string }[] = [];
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

// Condense transcript entries into chunks (to fit context window)
function condenseTranscript(entries: { time: number; text: string }[]): string {
  if (entries.length === 0) return '';

  // Group into ~30-second windows
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

export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    if (!hasRole(user.role, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      return createAuthResponse("Forbidden", 403);
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { transcript, videoDuration, videoTitle } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'transcript is required (VTT or SRT content)' }, { status: 400 });
    }

    // Parse and condense transcript
    const entries = parseTranscript(transcript);
    if (entries.length === 0) {
      return NextResponse.json({ error: 'Could not parse any timed entries from the transcript. Ensure it is valid VTT or SRT format.' }, { status: 400 });
    }

    const condensed = condenseTranscript(entries);
    const totalDuration = videoDuration || entries[entries.length - 1].time;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert educational content analyst. Given a video transcript with timestamps, generate logical chapter markers that break the video into navigable segments.

Rules:
- Each chapter should cover a distinct topic or concept
- Aim for segments of 5-8 minutes each (optimal for learning)
- The first chapter should always start at time 0
- Chapter titles should be concise (3-8 words), descriptive, and use title case
- Use the actual timestamp where the topic begins, not an approximation
- For a ${Math.round(totalDuration / 60)}-minute video, generate roughly ${Math.max(2, Math.min(15, Math.round(totalDuration / 360)))} to ${Math.max(3, Math.min(20, Math.round(totalDuration / 240)))} chapters

Respond with JSON: { "chapters": [{ "time": <seconds>, "title": "<chapter title>" }] }`
        },
        {
          role: 'user',
          content: `${videoTitle ? `Video title: "${videoTitle}"\n` : ''}Video duration: ${Math.round(totalDuration)} seconds (${Math.round(totalDuration / 60)} minutes)\n\nTranscript:\n${condensed}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const result = JSON.parse(content);
    if (!result.chapters || !Array.isArray(result.chapters)) {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    // Validate and clean chapters
    const chapters = result.chapters
      .filter((ch: any) => typeof ch.time === 'number' && typeof ch.title === 'string')
      .map((ch: any) => ({
        time: Math.max(0, Math.round(ch.time)),
        title: ch.title.trim(),
      }))
      .sort((a: any, b: any) => a.time - b.time);

    return NextResponse.json({ chapters });

  } catch (error: any) {
    console.error('Video chapters AI error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
