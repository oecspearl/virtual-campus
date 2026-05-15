import { NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { createLogger } from "@/lib/logger";

// GET /api/lessons/[id]/discussions - Get all discussions for a lesson
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = createLogger('api/lessons/[id]/discussions', request as any);
  try {
    const { id: lessonId } = await params;

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
      log.error('Error fetching lesson discussions', { lessonId }, error);
      return NextResponse.json({ error: "Failed to fetch discussions" }, { status: 500 });
    }

    return NextResponse.json({ discussions: discussions || [] });

  } catch (error) {
    log.error('GET handler crashed', undefined, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/lessons/[id]/discussions - Create a new lesson discussion
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = createLogger('api/lessons/[id]/discussions', request as any);
  try {
    const { id: lessonId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;

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
      log.error('Error fetching lesson', { lessonId }, lessonError);
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (!lesson.course_id) {
      log.warn('Lesson has no course_id', { lessonId });
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
      log.error('Error creating lesson discussion', { lessonId, userId: user.id }, error);
      return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
    }

    return NextResponse.json(discussion);

  } catch (error) {
    log.error('POST handler crashed', undefined, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
