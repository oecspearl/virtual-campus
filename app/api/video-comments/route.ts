import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/video-comments?lesson_id=xxx
 * Returns all comments for a lesson, with author info, ordered by video_timestamp.
 * Top-level comments first, replies nested.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lesson_id');

    if (!lessonId) {
      return NextResponse.json({ error: 'lesson_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: comments, error } = await tq.from('video_comments')
      .select('id, lesson_id, course_id, author_id, parent_id, video_timestamp, body, is_edited, created_at, updated_at')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Video Comments] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Fetch author profiles
    const authorIds = [...new Set((comments || []).map((c: any) => c.author_id))];
    let authorMap: Record<string, { name: string; email: string; role: string }> = {};

    if (authorIds.length > 0) {
      const serviceSupabase = createServiceSupabaseClient();
      const { data: authors } = await serviceSupabase
        .from('users')
        .select('id, name, email, role')
        .in('id', authorIds);

      if (authors) {
        authors.forEach((a: any) => {
          authorMap[a.id] = { name: a.name || a.email || 'Anonymous', email: a.email, role: a.role };
        });
      }
    }

    // Separate top-level and replies
    const topLevel = (comments || []).filter((c: any) => !c.parent_id);
    const replies = (comments || []).filter((c: any) => c.parent_id);

    // Build threaded structure
    const threaded = topLevel
      .sort((a: any, b: any) => (a.video_timestamp ?? 0) - (b.video_timestamp ?? 0))
      .map((comment: any) => ({
        ...comment,
        author: authorMap[comment.author_id] || { name: 'Anonymous', email: '', role: 'student' },
        replies: replies
          .filter((r: any) => r.parent_id === comment.id)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((r: any) => ({
            ...r,
            author: authorMap[r.author_id] || { name: 'Anonymous', email: '', role: 'student' },
          })),
      }));

    return NextResponse.json({ comments: threaded });
  } catch (error: any) {
    console.error('[Video Comments] GET error:', error?.message || error);
    if (error?.message?.includes('x-tenant-id')) {
      return NextResponse.json({ error: 'Tenant context required', comments: [] }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error', comments: [] }, { status: 500 });
  }
}

/**
 * POST /api/video-comments
 * Create a new comment or reply.
 * Body: { lesson_id, course_id?, video_timestamp?, parent_id?, body }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { lesson_id, course_id, video_timestamp, parent_id, body: commentBody } = body;

    if (!lesson_id || !commentBody?.trim()) {
      return NextResponse.json({ error: 'lesson_id and body are required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: comment, error } = await tq.from('video_comments')
      .insert({
        lesson_id,
        course_id: course_id || null,
        author_id: user.id,
        parent_id: parent_id || null,
        video_timestamp: parent_id ? null : (video_timestamp ?? null), // only top-level gets timestamp
        body: commentBody.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Video Comments] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Fetch author info
    const serviceSupabase = createServiceSupabaseClient();
    const { data: author } = await serviceSupabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      comment: {
        ...comment,
        author: author ? { name: author.name || author.email, email: author.email, role: author.role } : { name: 'You', email: '', role: 'student' },
        replies: [],
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Video Comments] POST error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/video-comments?id=xxx
 * Delete a comment (author or staff only).
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership or staff role
    const serviceSupabase = createServiceSupabaseClient();
    const { data: existing } = await serviceSupabase
      .from('video_comments')
      .select('author_id')
      .eq('id', commentId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const { data: userProfile } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = ['super_admin', 'tenant_admin', 'admin', 'instructor'].includes(userProfile?.role || '');
    const isAuthor = existing.author_id === user.id;

    if (!isAuthor && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await tq.from('video_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('[Video Comments] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Video Comments] DELETE error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
