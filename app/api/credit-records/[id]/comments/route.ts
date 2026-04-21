import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/credit-records/[id]/comments
 * Returns the comment thread for a credit record. Accessible to the record's
 * student and to registrars in the record's tenant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recordId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify access to the parent record
    const { data: record } = await tq
      .from('credit_records')
      .select('id, student_id')
      .eq('id', recordId)
      .single();

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const callerRole = authResult.userProfile!.role;
    const isRegistrar = hasRole(callerRole, ['super_admin', 'tenant_admin', 'admin']);
    const isOwner = record.student_id === authResult.user!.id;
    if (!isRegistrar && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await tq
      .from('credit_record_comments')
      .select(`
        id, body, created_at, author_id,
        author:users!credit_record_comments_author_id_fkey(id, name, email, role)
      `)
      .eq('credit_record_id', recordId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Credit comments GET error:', error);
      return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (error) {
    console.error('Credit comments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/credit-records/[id]/comments
 * Body: { body }
 * Students can post on their own records; registrars can post on any in their tenant.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recordId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const body = await request.json();
    const text = (body.body || '').toString().trim();
    if (!text) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: 'Comment too long (max 4000 chars)' }, { status: 400 });
    }

    const { data: record } = await tq
      .from('credit_records')
      .select('id, student_id, course_title, student:users!credit_records_student_id_fkey(id, name)')
      .eq('id', recordId)
      .single();

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const callerRole = authResult.userProfile!.role;
    const isRegistrar = hasRole(callerRole, ['super_admin', 'tenant_admin', 'admin']);
    const isOwner = record.student_id === authResult.user!.id;
    if (!isRegistrar && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: inserted, error } = await tq
      .from('credit_record_comments')
      .insert({
        credit_record_id: recordId,
        author_id: authResult.user!.id,
        body: text,
      })
      .select(`
        id, body, created_at, author_id,
        author:users!credit_record_comments_author_id_fkey(id, name, email, role)
      `)
      .single();

    if (error) {
      console.error('Credit comment POST error:', error);
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    // Notify the other party (in-app only — no new email template required)
    const notifyUserId = isRegistrar ? record.student_id : null;
    if (notifyUserId) {
      // Registrar posted → notify student
      await tq.from('in_app_notifications').insert({
        user_id: notifyUserId,
        type: 'credit_record_comment',
        title: 'New comment on your credit transfer',
        message: `Registrar left a note on "${record.course_title}": ${text.slice(0, 140)}${text.length > 140 ? '…' : ''}`,
        link_url: '/credit-records',
        metadata: { credit_record_id: recordId, comment_id: inserted.id },
      });
    }
    // If student posted, we don't ping a single registrar — the queue surfaces it.

    return NextResponse.json({ comment: inserted }, { status: 201 });
  } catch (error) {
    console.error('Credit comment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
