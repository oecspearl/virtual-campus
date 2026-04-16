import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

// Allow up to 5 minutes for large video transcription
export const maxDuration = 300;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * POST /api/ai/transcribe
 *
 * Auto-generate a VTT transcript for a video lesson using OpenAI Whisper.
 *
 * Body: { lessonId: string, language?: string }
 *
 * Flow:
 *  1. Look up the lesson and find the video URL
 *  2. Download the video from Supabase Storage
 *  3. Send to Whisper API (verbose_json format for timestamps)
 *  4. Convert Whisper segments to VTT
 *  5. Save to video_captions table (auto_generated = true, is_default = true)
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth + RBAC ──
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    if (!hasRole(user.role, ['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 });
    }

    // ── Parse request ──
    const { lessonId, language } = await request.json();
    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // ── Fetch lesson and find the video URL ──
    const { data: lesson, error: lessonError } = await tq
      .from('lessons')
      .select('id, title, content, content_type, course_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const videoUrl = extractVideoUrl(lesson);
    if (!videoUrl) {
      return NextResponse.json({
        error: 'No video URL found in this lesson. Only lessons with video content can be transcribed.',
      }, { status: 400 });
    }

    // ── Check if a transcript already exists ──
    const { data: existingCaption } = await tq
      .from('video_captions')
      .select('id, auto_generated')
      .eq('lesson_id', lessonId)
      .eq('language', language || 'en')
      .single();

    if (existingCaption && !existingCaption.auto_generated) {
      return NextResponse.json({
        error: 'A manually uploaded transcript already exists for this language. Delete it first to auto-generate.',
      }, { status: 409 });
    }

    // ── Download the video ──
    console.log(`Transcribe: Downloading video for lesson ${lessonId}...`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json({
        error: `Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`,
      }, { status: 502 });
    }

    const contentLength = videoResponse.headers.get('content-length');
    const fileSizeBytes = contentLength ? parseInt(contentLength) : 0;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    // Whisper limit is 25MB
    if (fileSizeMB > 25) {
      return NextResponse.json({
        error: `Video file is ${fileSizeMB.toFixed(1)}MB, which exceeds the 25MB Whisper API limit. Please upload a smaller file or provide a manual transcript.`,
      }, { status: 413 });
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    // Determine a filename for Whisper (it uses the extension to detect format)
    const urlPath = new URL(videoUrl).pathname;
    const ext = urlPath.split('.').pop()?.toLowerCase() || 'mp4';
    const fileName = `lesson-${lessonId}.${ext}`;

    // ── Send to Whisper ──
    console.log(`Transcribe: Sending ${fileSizeMB.toFixed(1)}MB to Whisper API...`);
    const file = new File([videoBuffer], fileName, {
      type: ext === 'webm' ? 'video/webm' : ext === 'ogg' ? 'video/ogg' : 'video/mp4',
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      ...(language ? { language } : {}),
    });

    if (!transcription.segments || transcription.segments.length === 0) {
      return NextResponse.json({
        error: 'Whisper returned no transcript segments. The video may have no speech.',
      }, { status: 422 });
    }

    console.log(`Transcribe: Got ${transcription.segments.length} segments, duration: ${transcription.duration}s`);

    // ── Convert to VTT ──
    const vttContent = segmentsToVTT(transcription.segments);
    const detectedLanguage = (transcription as any).language || language || 'en';

    // ── Save to video_captions ──
    const captionData = {
      video_url: videoUrl,
      lesson_id: lessonId,
      language: detectedLanguage,
      label: `${getLanguageName(detectedLanguage)} (Auto-generated)`,
      caption_format: 'vtt' as const,
      caption_url: '',
      caption_content: vttContent,
      auto_generated: true,
      is_default: true,
      uploaded_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Unset any existing default for this video
    await tq
      .from('video_captions')
      .update({ is_default: false })
      .eq('lesson_id', lessonId);

    let result;
    if (existingCaption) {
      // Update existing auto-generated caption
      result = await tq
        .from('video_captions')
        .update(captionData)
        .eq('id', existingCaption.id)
        .select()
        .single();
    } else {
      result = await tq
        .from('video_captions')
        .insert(captionData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Transcribe: Failed to save caption:', result.error);
      return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
    }

    // ── Track AI usage ──
    const estimatedCost = (transcription.duration || 0) / 60 * 0.006; // Whisper: $0.006/min
    try {
      await tq.raw.rpc('update_ai_usage', {
        user_uuid: user.id,
        additional_calls: 1,
        additional_tokens: 0,
        additional_cost: estimatedCost,
      });
    } catch (e) {
      console.error('Transcribe: Failed to track usage:', e);
    }

    console.log(`Transcribe: Saved transcript for lesson ${lessonId} (${transcription.segments.length} segments, ${detectedLanguage})`);

    return NextResponse.json({
      success: true,
      caption: result.data,
      stats: {
        duration: transcription.duration,
        segments: transcription.segments.length,
        language: detectedLanguage,
        fileSizeMB: fileSizeMB.toFixed(1),
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
      },
    });

  } catch (error: any) {
    console.error('Transcribe API error:', error);

    if (error?.status === 413 || error?.code === 'file_too_large') {
      return NextResponse.json({
        error: 'Video file exceeds the 25MB Whisper API limit. Please upload a shorter or lower-resolution video.',
      }, { status: 413 });
    }
    if (error?.status === 429) {
      return NextResponse.json({
        error: 'OpenAI rate limit exceeded. Please try again in a moment.',
      }, { status: 429 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extract the video URL from a lesson's content blocks or direct fields.
 */
function extractVideoUrl(lesson: any): string | null {
  // Check content blocks first
  if (Array.isArray(lesson.content)) {
    for (const block of lesson.content) {
      if (block.type === 'video' || block.type === 'interactive_video') {
        const url = block.data?.url || block.data?.videoUrl;
        if (url) return url;
      }
    }
  }

  // Fallback: check for a direct video_url field
  if (lesson.video_url) return lesson.video_url;

  return null;
}

/**
 * Convert Whisper segments to WebVTT format.
 */
function segmentsToVTT(segments: any[]): string {
  let vtt = 'WEBVTT\n\n';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startTime = formatVTTTime(seg.start);
    const endTime = formatVTTTime(seg.end);
    const text = (seg.text || '').trim();

    if (text) {
      vtt += `${i + 1}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${text}\n\n`;
    }
  }

  return vtt;
}

/**
 * Format seconds into VTT timestamp: HH:MM:SS.mmm
 */
function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Map language code to human-readable name.
 */
function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    pt: 'Portuguese', it: 'Italian', nl: 'Dutch', ru: 'Russian',
    zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic',
    hi: 'Hindi', sv: 'Swedish', pl: 'Polish', da: 'Danish',
    no: 'Norwegian', fi: 'Finnish', tr: 'Turkish',
  };
  return names[code] || code.toUpperCase();
}
