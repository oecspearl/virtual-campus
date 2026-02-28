import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/student/notes
 * Get all notes for the current student
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lesson_id');
    const courseId = searchParams.get('course_id');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('student_notes')
      .select(`
        id,
        lesson_id,
        course_id,
        content,
        content_position,
        highlight_color,
        tags,
        created_at,
        updated_at,
        lesson:lessons(id, title, course_id),
        course:courses(id, title)
      `)
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false });

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ notes: notes || [] });
  } catch (error) {
    console.error('Error in notes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/student/notes
 * Create a new note
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lesson_id, course_id, content, content_position, highlight_color, tags } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: note, error } = await tq
      .from('student_notes')
      .insert({
        student_id: user.id,
        lesson_id: lesson_id || null,
        course_id: course_id || null,
        content,
        content_position: content_position || null,
        highlight_color: highlight_color || 'yellow',
        tags: tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error in notes POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
