import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';

// GET - Fetch resource links for a course or lesson
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');

    if (!courseId && !lessonId) {
      return NextResponse.json({ error: 'courseId or lessonId is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('resource_links')
      .select('*')
      .order('order', { ascending: true });

    if (courseId && !lessonId) {
      // Course-level links only
      query = query.eq('course_id', courseId).is('lesson_id', null);
    } else if (lessonId) {
      // Lesson-level links (may also have course_id)
      query = query.eq('lesson_id', lessonId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ links: data || [] });
  } catch (error: any) {
    console.error('Error fetching resource links:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resource links' },
      { status: 500 }
    );
  }
}

// POST - Create a new resource link
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courseId, lessonId, title, url, description, link_type } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: 'title and url are required' },
        { status: 400 }
      );
    }

    // Verify that either courseId or lessonId is provided
    if (!courseId && !lessonId) {
      return NextResponse.json(
        { error: 'courseId or lessonId is required' },
        { status: 400 }
      );
    }

    // Note: Both courseId and lessonId can be provided for lesson-level links
    // This allows lesson links to be associated with both the lesson and its course

    // Verify user has permission (instructor, curriculum_designer, admin, or super_admin)
    if (!['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Create the resource link
    const insertData: any = {
      title,
      url,
      description: description || null,
      link_type: link_type || 'external',
      created_by: user.id,
      order: 0
    };

    if (courseId) insertData.course_id = courseId;
    if (lessonId) insertData.lesson_id = lessonId;

    const { data: link, error } = await supabase
      .from('resource_links')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ link }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating resource link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create resource link' },
      { status: 500 }
    );
  }
}

