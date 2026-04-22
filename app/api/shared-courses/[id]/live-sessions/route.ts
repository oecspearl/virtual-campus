import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { requireAcceptedShare } from '@/lib/share-validation';

const PROVIDERS = ['zoom', 'teams', 'meet', 'jitsi', 'other'] as const;

/**
 * GET /api/shared-courses/[id]/live-sessions
 * Returns target-tenant scheduled sessions for this share.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const validation = await requireAcceptedShare(shareId, tenantId);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 404 });

    const { data, error } = await tq
      .from('shared_course_live_sessions')
      .select(`
        id, title, description, scheduled_at, duration_minutes,
        meeting_url, provider, status, created_at,
        instructor:users!shared_course_live_sessions_instructor_id_fkey(id, name, email)
      `)
      .eq('course_share_id', shareId)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Live sessions GET error:', error);
      return NextResponse.json({ error: 'Failed to load live sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error('Live sessions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/shared-courses/[id]/live-sessions
 * Schedule a new session. Requires can_schedule_live_sessions + staff role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile!.role, [
      'super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer',
    ])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const validation = await requireAcceptedShare(shareId, tenantId);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 404 });
    const share = validation.share!;
    if (!share.can_schedule_live_sessions) {
      return NextResponse.json(
        { error: 'Live sessions are not enabled for this share' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const title = (body.title || '').toString().trim();
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    if (!body.scheduled_at || isNaN(Date.parse(body.scheduled_at))) {
      return NextResponse.json({ error: 'scheduled_at must be a valid ISO timestamp' }, { status: 400 });
    }

    const duration = Number(body.duration_minutes);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 600) {
      return NextResponse.json(
        { error: 'duration_minutes must be between 1 and 600' },
        { status: 400 }
      );
    }

    const provider = PROVIDERS.includes(body.provider) ? body.provider : 'other';

    const { data, error } = await tq
      .from('shared_course_live_sessions')
      .insert({
        course_share_id: shareId,
        source_course_id: share.course_id,
        instructor_id: authResult.user!.id,
        title: title.slice(0, 500),
        description: body.description ? String(body.description) : null,
        scheduled_at: new Date(body.scheduled_at).toISOString(),
        duration_minutes: duration,
        meeting_url: body.meeting_url ? String(body.meeting_url).slice(0, 1000) : null,
        provider,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      console.error('Live session POST error:', error);
      return NextResponse.json({ error: 'Failed to schedule session' }, { status: 500 });
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (error) {
    console.error('Live sessions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

