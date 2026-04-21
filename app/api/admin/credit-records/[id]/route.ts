import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { sendNotification } from '@/lib/notifications';

type Action = 'start_review' | 'approve' | 'reject';

/**
 * PATCH /api/admin/credit-records/[id]
 * Registrar moves a credit record through the review workflow.
 *
 * Body: { action, awarded_credits?, equivalent_course_id?, equivalence_notes?, review_notes? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile!.role, ['super_admin', 'tenant_admin', 'admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const body = await request.json();
    const action = body.action as Action;

    if (!['start_review', 'approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: record } = await tq
      .from('credit_records')
      .select('id, status, credits, student_id, course_title, issuing_institution_name')
      .eq('id', id)
      .single();

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (record.status === 'approved' || record.status === 'rejected' || record.status === 'withdrawn') {
      return NextResponse.json(
        { error: `Record is already ${record.status}; create a new submission to revise` },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      reviewed_by: authResult.user!.id,
      reviewed_at: new Date().toISOString(),
    };

    if (action === 'start_review') {
      update.status = 'under_review';
    } else if (action === 'approve') {
      update.status = 'approved';
      if (body.awarded_credits !== undefined && body.awarded_credits !== null) {
        const awarded = Number(body.awarded_credits);
        if (!Number.isFinite(awarded) || awarded < 0) {
          return NextResponse.json(
            { error: 'awarded_credits must be a non-negative number' },
            { status: 400 }
          );
        }
        update.awarded_credits = awarded;
      } else {
        update.awarded_credits = record.credits;
      }
      if (body.equivalent_course_id) update.equivalent_course_id = body.equivalent_course_id;
      if (body.equivalence_notes) update.equivalence_notes = String(body.equivalence_notes);
      if (body.review_notes) update.review_notes = String(body.review_notes);
    } else if (action === 'reject') {
      update.status = 'rejected';
      if (!body.review_notes || String(body.review_notes).trim().length === 0) {
        return NextResponse.json(
          { error: 'review_notes are required when rejecting' },
          { status: 400 }
        );
      }
      update.review_notes = String(body.review_notes);
    }

    const { data, error } = await tq
      .from('credit_records')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Credit record PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
    }

    // Notify the student of the status change (in-app + email, tenant-scoped)
    const awardedNote =
      action === 'approve' && update.awarded_credits !== undefined
        ? ` ${Number(update.awarded_credits).toFixed(2)} credit${Number(update.awarded_credits) === 1 ? '' : 's'} awarded.`
        : '';
    const notifType =
      action === 'start_review'
        ? 'credit_record_under_review'
        : action === 'approve'
        ? 'credit_record_approved'
        : 'credit_record_rejected';

    const notifMap: Record<Action, { title: string; message: string }> = {
      start_review: {
        title: 'Credit transfer under review',
        message: `Your credit submission for "${record.course_title}" from ${record.issuing_institution_name} is now under review.`,
      },
      approve: {
        title: 'Credit transfer approved',
        message: `Your credits for "${record.course_title}" from ${record.issuing_institution_name} have been approved.${awardedNote}`,
      },
      reject: {
        title: 'Credit transfer rejected',
        message: `Your credit submission for "${record.course_title}" was not approved. Reason: ${update.review_notes || '—'}`,
      },
    };
    const notif = notifMap[action];

    // In-app notification (tenant-scoped via tq)
    await tq
      .from('in_app_notifications')
      .insert({
        user_id: record.student_id,
        type: notifType,
        title: notif.title,
        message: notif.message,
        link_url: `/credit-records/${id}`,
        metadata: { credit_record_id: id },
      });

    // Email notification (best-effort — skipped silently if template missing)
    try {
      const [studentRow, reviewingTenantRow] = await Promise.all([
        tq.raw.from('users').select('name, email').eq('id', record.student_id).single(),
        tq.raw.from('tenants').select('name').eq('id', tenantId).single(),
      ]);
      const recordUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/credit-records/${id}`;
      const equivalenceBlock = update.equivalence_notes
        ? `<p><strong>Equivalence:</strong> ${String(update.equivalence_notes)}</p>`
        : '';
      await sendNotification({
        userId: record.student_id,
        type: notifType,
        templateVariables: {
          student_name: studentRow.data?.name || 'Student',
          course_title: record.course_title,
          issuing_institution_name: record.issuing_institution_name,
          reviewing_institution_name: reviewingTenantRow.data?.name || 'Your institution',
          awarded_credits:
            update.awarded_credits !== undefined
              ? Number(update.awarded_credits).toFixed(2)
              : '',
          equivalence_block: equivalenceBlock,
          review_notes: update.review_notes || '',
          record_url: recordUrl,
        },
        metadata: { credit_record_id: id, action },
      });
    } catch (emailErr) {
      console.error('Credit record email notification failed:', emailErr);
    }

    return NextResponse.json({ record: data });
  } catch (error) {
    console.error('Admin credit records PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
