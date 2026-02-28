import { NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

// GET /api/lessons/[id]/discussions - Get all discussions for a lesson
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: lessonId } = await params;
    console.log('Fetching discussions for lesson:', lessonId);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get discussions with author information and reply counts
    const { data: discussions, error } = await tq.from('lesson_discussions')
      .select(`
        *,
        author:users!lesson_discussions_author_id_fkey(id, name, email),
        replies:lesson_discussion_replies(count),
        votes:lesson_discussion_votes(count)
      `)
      .eq('lesson_id', lessonId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lesson discussions:', error);
      return NextResponse.json({ error: "Failed to fetch discussions" }, { status: 500 });
    }

    console.log('Lesson discussions fetched successfully:', discussions?.length || 0);
    return NextResponse.json({ discussions: discussions || [] });

  } catch (error) {
    console.error('Lesson discussions API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/lessons/[id]/discussions - Create a new lesson discussion
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: lessonId } = await params;
    console.log('Creating discussion for lesson:', lessonId);

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    console.log('Creating lesson discussion for user:', user.id);

    const body = await request.json();
    const { title, content, is_pinned = false, is_locked = false } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get the course_id directly from the lesson
    const { data: lesson, error: lessonError } = await tq.from('lessons')
      .select('course_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('Error fetching lesson:', lessonError);
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (!lesson.course_id) {
      console.error('Lesson has no course_id:', lesson);
      return NextResponse.json({ error: "Lesson is not associated with a course" }, { status: 400 });
    }

    const { data: discussion, error } = await tq.from('lesson_discussions')
      .insert([{
        lesson_id: lessonId,
        course_id: lesson.course_id,
        title: title.trim(),
        content: content.trim(),
        author_id: user.id,
        is_pinned,
        is_locked
      }])
      .select(`
        *,
        author:users!lesson_discussions_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating lesson discussion:', error);
      return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
    }

    console.log('Lesson discussion created successfully:', discussion.id);
    return NextResponse.json(discussion);

  } catch (error) {
    console.error('Create lesson discussion error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
