import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * DELETE /api/credit-records/[id]
 * Student withdraws their own pending submission.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: record } = await tq
      .from('credit_records')
      .select('id, student_id, status')
      .eq('id', id)
      .single();

    if (!record || record.student_id !== authResult.user!.id) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (!['pending', 'under_review'].includes(record.status)) {
      return NextResponse.json(
        { error: 'Only pending or under-review records can be withdrawn' },
        { status: 400 }
      );
    }

    const { error } = await tq
      .from('credit_records')
      .update({ status: 'withdrawn' })
      .eq('id', id);

    if (error) {
      console.error('Credit record withdraw error:', error);
      return NextResponse.json({ error: 'Failed to withdraw record' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Credit record DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
