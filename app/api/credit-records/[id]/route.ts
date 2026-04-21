import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/credit-records/[id]
 * Returns a single credit record. Accessible to the record's student
 * (read-only) and to registrars in the record's tenant.
 */
export async function GET(
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

    const { data, error } = await tq
      .from('credit_records')
      .select(`
        id, source_type, issuing_institution_name,
        course_title, course_code, credits, awarded_credits,
        grade, grade_scale, completion_date, status,
        evidence_url, equivalence_notes, review_notes,
        reviewed_at, created_at, updated_at, student_id,
        student:users!credit_records_student_id_fkey(id, name, email),
        issuing_tenant:tenants!credit_records_issuing_tenant_id_fkey(id, name, slug),
        equivalent_course:courses!credit_records_equivalent_course_id_fkey(id, title),
        reviewer:users!credit_records_reviewed_by_fkey(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const callerRole = authResult.userProfile!.role;
    const isRegistrar = hasRole(callerRole, ['super_admin', 'tenant_admin', 'admin']);
    const isOwner = (data as any).student_id === authResult.user!.id;
    if (!isRegistrar && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ record: data, viewer: { role: callerRole, is_registrar: isRegistrar, is_owner: isOwner } });
  } catch (error) {
    console.error('Credit record GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
