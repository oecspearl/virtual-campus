import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/accessibility/captions
 * Get captions for a video
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('video_url');
    const lessonId = searchParams.get('lesson_id');

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq.from('video_captions')
      .select('*')
      .order('is_default', { ascending: false })
      .order('language', { ascending: true });

    if (videoUrl) {
      query = query.eq('video_url', videoUrl);
    } else if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    } else {
      return NextResponse.json(
        { error: 'video_url or lesson_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching captions:', error);
      return NextResponse.json({ error: 'Failed to fetch captions' }, { status: 500 });
    }

    return NextResponse.json({ captions: data || [] });
  } catch (error) {
    console.error('Error in captions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/accessibility/captions
 * Upload a new caption track
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: { user } } = await tq.raw.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: userData } = await tq.from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['admin', 'super_admin', 'instructor', 'curriculum_designer'];
    if (!userData || !allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const videoUrl = formData.get('video_url') as string;
    const language = formData.get('language') as string || 'en';
    const label = formData.get('label') as string;
    const lessonId = formData.get('lesson_id') as string | null;

    if (!file || !videoUrl) {
      return NextResponse.json(
        { error: 'file and video_url are required' },
        { status: 400 }
      );
    }

    // Determine caption format from file extension
    const fileName = file.name.toLowerCase();
    let captionFormat: 'vtt' | 'srt' = 'vtt';
    if (fileName.endsWith('.srt')) {
      captionFormat = 'srt';
    }

    // Read file content
    const fileContent = await file.text();

    // Generate a unique filename for storage
    const timestamp = Date.now();
    const storagePath = `captions/${timestamp}_${language}.${captionFormat}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await tq.raw
      .storage
      .from('captions')
      .upload(storagePath, fileContent, {
        contentType: captionFormat === 'vtt' ? 'text/vtt' : 'application/x-subrip',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading caption file:', uploadError);
      // Fall back to storing content directly in database
    }

    // Get the public URL if upload succeeded
    let captionUrl = '';
    if (uploadData) {
      const { data: urlData } = tq.raw
        .storage
        .from('captions')
        .getPublicUrl(storagePath);
      captionUrl = urlData.publicUrl;
    }

    // Check if this language already exists for this video
    const { data: existingCaption } = await tq.from('video_captions')
      .select('id')
      .eq('video_url', videoUrl)
      .eq('language', language)
      .single();

    // If caption already exists, update it; otherwise insert
    const captionData = {
      video_url: videoUrl,
      lesson_id: lessonId || null,
      language,
      label: label || language,
      caption_format: captionFormat,
      caption_url: captionUrl || '',
      caption_content: captionUrl ? null : fileContent,  // Store inline if upload failed
      auto_generated: false,
      is_default: false,
      uploaded_by: user.id,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingCaption) {
      result = await tq.from('video_captions')
        .update(captionData)
        .eq('id', existingCaption.id)
        .select()
        .single();
    } else {
      result = await tq.from('video_captions')
        .insert(captionData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving caption:', result.error);
      return NextResponse.json({ error: 'Failed to save caption' }, { status: 500 });
    }

    return NextResponse.json({ caption: result.data });
  } catch (error) {
    console.error('Error in captions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
