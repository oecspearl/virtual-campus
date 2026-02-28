import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/student/bookmarks
 * Get all bookmarks for the current student
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const folder = searchParams.get('folder');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('student_bookmarks')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('bookmark_type', type);
    }

    if (folder) {
      query = query.eq('folder', folder);
    }

    const { data: bookmarks, error } = await query;

    if (error) {
      console.error('Error fetching bookmarks:', error);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    // Batch-fetch targets by type to avoid N+1 queries
    const allBookmarks = bookmarks || [];
    const lessonIds = [...new Set(
      allBookmarks
        .filter(b => b.bookmark_type === 'lesson' || b.bookmark_type === 'lesson_content')
        .map(b => b.bookmark_id)
    )];
    const courseIds = [...new Set(
      allBookmarks.filter(b => b.bookmark_type === 'course').map(b => b.bookmark_id)
    )];
    const resourceIds = [...new Set(
      allBookmarks.filter(b => b.bookmark_type === 'resource').map(b => b.bookmark_id)
    )];

    // Run all batch fetches in parallel (max 3 queries instead of N)
    const [lessonsResult, coursesResult, resourcesResult] = await Promise.all([
      lessonIds.length > 0
        ? tq.from('lessons').select('id, title, course_id, course:courses(title)').in('id', lessonIds)
        : { data: [] },
      courseIds.length > 0
        ? tq.from('courses').select('id, title, thumbnail').in('id', courseIds)
        : { data: [] },
      resourceIds.length > 0
        ? tq.from('lecturer_resources').select('id, title, resource_type').in('id', resourceIds)
        : { data: [] },
    ]);

    // Index results by ID for O(1) lookup
    const lessonsMap = new Map((lessonsResult.data || []).map((l: any) => [l.id, l]));
    const coursesMap = new Map((coursesResult.data || []).map((c: any) => [c.id, c]));
    const resourcesMap = new Map((resourcesResult.data || []).map((r: any) => [r.id, r]));

    // Enrich bookmarks from the pre-fetched maps
    const enrichedBookmarks = allBookmarks.map((bookmark) => {
      let target = null;

      switch (bookmark.bookmark_type) {
        case 'lesson':
          target = lessonsMap.get(bookmark.bookmark_id) || null;
          break;
        case 'lesson_content': {
          const lesson = lessonsMap.get(bookmark.bookmark_id) || null;
          let contentMeta = null;
          try {
            if (bookmark.notes && bookmark.notes.startsWith('{')) {
              contentMeta = JSON.parse(bookmark.notes);
            }
          } catch {
            // Not JSON, just regular notes
          }
          target = lesson ? {
            ...lesson,
            content_type: contentMeta?.content_type,
            content_title: contentMeta?.content_title,
            content_index: contentMeta?.content_index,
          } : null;
          break;
        }
        case 'course':
          target = coursesMap.get(bookmark.bookmark_id) || null;
          break;
        case 'resource':
          target = resourcesMap.get(bookmark.bookmark_id) || null;
          break;
      }

      return { ...bookmark, target };
    });

    // Get unique folders for filter options
    const { data: folders } = await tq
      .from('student_bookmarks')
      .select('folder')
      .eq('student_id', user.id)
      .not('folder', 'is', null);

    const uniqueFolders = [...new Set(folders?.map(f => f.folder).filter(Boolean))];

    return NextResponse.json({
      bookmarks: enrichedBookmarks,
      folders: uniqueFolders,
    });
  } catch (error) {
    console.error('Error in bookmarks GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/student/bookmarks
 * Create or toggle a bookmark
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookmark_type, bookmark_id, folder, notes, toggle, metadata } = body;

    if (!bookmark_type || !bookmark_id) {
      return NextResponse.json({
        error: 'bookmark_type and bookmark_id are required'
      }, { status: 400 });
    }

    // For lesson_content, store metadata as JSON in notes field
    let finalNotes = notes;
    if (bookmark_type === 'lesson_content' && metadata) {
      finalNotes = JSON.stringify(metadata);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if bookmark already exists
    // For lesson_content, we need to check both bookmark_id AND content_index
    let existing = null;
    if (bookmark_type === 'lesson_content' && metadata?.content_index !== undefined) {
      // Get all lesson_content bookmarks for this lesson, then filter by content_index
      const { data: contentBookmarks } = await tq
        .from('student_bookmarks')
        .select('id, notes')
        .eq('student_id', user.id)
        .eq('bookmark_type', 'lesson_content')
        .eq('bookmark_id', bookmark_id);

      // Find the one with matching content_index in notes
      existing = contentBookmarks?.find(b => {
        try {
          const meta = JSON.parse(b.notes || '{}');
          return meta.content_index === metadata.content_index;
        } catch {
          return false;
        }
      }) || null;
    } else {
      // For other bookmark types, simple lookup
      const { data } = await tq
        .from('student_bookmarks')
        .select('id')
        .eq('student_id', user.id)
        .eq('bookmark_type', bookmark_type)
        .eq('bookmark_id', bookmark_id)
        .single();
      existing = data;
    }

    // Toggle mode: remove if exists, add if not
    if (toggle && existing) {
      await tq
        .from('student_bookmarks')
        .delete()
        .eq('id', existing.id);

      return NextResponse.json({ bookmarked: false });
    }

    if (existing) {
      // Update existing bookmark
      const { data: bookmark, error } = await tq
        .from('student_bookmarks')
        .update({
          folder: folder !== undefined ? folder : undefined,
          notes: notes !== undefined ? notes : undefined,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating bookmark:', error);
        return NextResponse.json({ error: 'Failed to update bookmark' }, { status: 500 });
      }

      return NextResponse.json({ bookmark, bookmarked: true });
    }

    // Create new bookmark
    const { data: bookmark, error } = await tq
      .from('student_bookmarks')
      .insert({
        student_id: user.id,
        bookmark_type,
        bookmark_id,
        folder: folder || null,
        notes: finalNotes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bookmark:', error);
      return NextResponse.json({ error: 'Failed to create bookmark' }, { status: 500 });
    }

    return NextResponse.json({ bookmark, bookmarked: true }, { status: 201 });
  } catch (error) {
    console.error('Error in bookmarks POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
