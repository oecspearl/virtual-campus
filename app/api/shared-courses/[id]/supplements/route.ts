import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { requireAcceptedShare } from '@/lib/share-validation';

const SUPPLEMENT_KINDS = ['announcement', 'resource_link'] as const;
type SupplementKind = (typeof SUPPLEMENT_KINDS)[number];

/**
 * GET /api/shared-courses/[id]/supplements
 * Returns supplements attached to this share by the caller's tenant.
 * Any tenant member can read (RLS enforces target-tenant scope).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Validate share exists and is accessible by this tenant
    const validation = await requireAcceptedShare(shareId, tenantId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 404 });
    }

    const { data, error } = await tq
      .from('shared_course_supplements')
      .select(`
        id, kind, title, description, body, url, link_type, icon,
        position, published, created_at, updated_at,
        author:users!shared_course_supplements_author_id_fkey(id, name)
      `)
      .eq('course_share_id', shareId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Supplements GET error:', error);
      return NextResponse.json({ error: 'Failed to load supplements' }, { status: 500 });
    }

    return NextResponse.json({ supplements: data || [] });
  } catch (error) {
    console.error('Supplements GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/shared-courses/[id]/supplements
 * Target-tenant instructor adds a supplement. Requires
 * share.can_add_supplemental_content = true.
 *
 * Body: { kind, title, description?, body?, url?, link_type?, icon?, position?, published? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile!.role, [
      'super_admin',
      'tenant_admin',
      'admin',
      'instructor',
      'curriculum_designer',
    ])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const validation = await requireAcceptedShare(shareId, tenantId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 404 });
    }
    const share = validation.share!;
    if (!share.can_add_supplemental_content) {
      return NextResponse.json(
        { error: 'Supplemental content is not enabled for this share' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const kind = body.kind as SupplementKind;
    if (!SUPPLEMENT_KINDS.includes(kind)) {
      return NextResponse.json({ error: `kind must be one of ${SUPPLEMENT_KINDS.join(', ')}` }, { status: 400 });
    }

    const title = (body.title || '').toString().trim();
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (kind === 'resource_link') {
      if (!body.url || typeof body.url !== 'string') {
        return NextResponse.json({ error: 'url is required for resource_link' }, { status: 400 });
      }
    }
    if (kind === 'announcement') {
      if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
        return NextResponse.json({ error: 'body is required for announcement' }, { status: 400 });
      }
    }

    const { data, error } = await tq
      .from('shared_course_supplements')
      .insert({
        course_share_id: shareId,
        source_course_id: share.course_id,
        author_id: authResult.user!.id,
        kind,
        title: title.slice(0, 500),
        description: body.description ? String(body.description) : null,
        body: kind === 'announcement' ? String(body.body) : null,
        url: kind === 'resource_link' ? String(body.url).slice(0, 1000) : null,
        link_type: body.link_type ? String(body.link_type).slice(0, 50) : null,
        icon: body.icon ? String(body.icon).slice(0, 100) : null,
        position: Number.isFinite(Number(body.position)) ? Number(body.position) : 0,
        published: body.published === false ? false : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Supplement POST error:', error);
      return NextResponse.json({ error: 'Failed to create supplement' }, { status: 500 });
    }

    return NextResponse.json({ supplement: data }, { status: 201 });
  } catch (error) {
    console.error('Supplements POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
