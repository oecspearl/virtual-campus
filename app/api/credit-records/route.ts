import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/credit-records
 * List the authenticated student's credit transfer submissions in the current tenant.
 */
export async function GET(request: NextRequest) {
  try {
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
        reviewed_at, created_at, updated_at,
        issuing_tenant:tenants!credit_records_issuing_tenant_id_fkey(id, name, slug),
        equivalent_course:courses!credit_records_equivalent_course_id_fkey(id, title)
      `)
      .eq('student_id', authResult.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Credit records GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch credit records' }, { status: 500 });
    }

    return NextResponse.json({ records: data || [] });
  } catch (error) {
    console.error('Credit records GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/credit-records
 * Student submits a credit for review by the current tenant's registrar.
 *
 * Body:
 *   source_type: 'in_network' | 'external'
 *   issuing_institution_name: string (required)
 *   issuing_tenant_id?: uuid (required if in_network)
 *   source_course_id?: uuid (if in_network and known)
 *   source_enrollment_id?: uuid (if in_network completion exists)
 *   course_title, course_code?, credits, grade?, grade_scale?, completion_date?
 *   evidence_url?: string
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const body = await request.json();

    const sourceType = body.source_type === 'external' ? 'external' : 'in_network';

    if (!body.issuing_institution_name || !body.course_title) {
      return NextResponse.json(
        { error: 'issuing_institution_name and course_title are required' },
        { status: 400 }
      );
    }

    const credits = Number(body.credits);
    if (!Number.isFinite(credits) || credits < 0) {
      return NextResponse.json({ error: 'credits must be a non-negative number' }, { status: 400 });
    }

    if (sourceType === 'in_network' && !body.issuing_tenant_id) {
      return NextResponse.json(
        { error: 'issuing_tenant_id is required for in-network credits' },
        { status: 400 }
      );
    }

    // Cannot transfer credits from the same tenant that's reviewing them
    if (body.issuing_tenant_id && body.issuing_tenant_id === tenantId) {
      return NextResponse.json(
        { error: 'Cannot submit credits from the same institution for transfer review' },
        { status: 400 }
      );
    }

    // Enforce governance flags:
    //   receiving tenant must accept credit submissions
    //   issuing tenant (if in_network) must allow its courses to be cited
    const governanceTargets = [tenantId];
    if (sourceType === 'in_network' && body.issuing_tenant_id) {
      governanceTargets.push(body.issuing_tenant_id);
    }
    const { data: governanceRows } = await tq.raw
      .from('tenants')
      .select('id, credit_transfer_accept_enabled, credit_transfer_issue_enabled')
      .in('id', governanceTargets);

    const byId = new Map((governanceRows || []).map((r: any) => [r.id, r]));
    const receiver = byId.get(tenantId);
    if (receiver && receiver.credit_transfer_accept_enabled === false) {
      return NextResponse.json(
        { error: 'This institution is not currently accepting credit-transfer submissions.' },
        { status: 403 }
      );
    }
    if (sourceType === 'in_network' && body.issuing_tenant_id) {
      const issuer = byId.get(body.issuing_tenant_id);
      if (issuer && issuer.credit_transfer_issue_enabled === false) {
        return NextResponse.json(
          { error: 'The selected issuing institution is not currently participating in credit transfer.' },
          { status: 403 }
        );
      }
    }

    // If source_enrollment_id is supplied, verify it belongs to the student and is completed
    if (body.source_enrollment_id) {
      const { data: enrollment } = await tq
        .from('cross_tenant_enrollments')
        .select('id, student_id, status, source_course_id, source_tenant_id')
        .eq('id', body.source_enrollment_id)
        .single();

      if (!enrollment || enrollment.student_id !== authResult.user!.id) {
        return NextResponse.json(
          { error: 'Referenced enrollment not found' },
          { status: 404 }
        );
      }
      if (enrollment.status !== 'completed') {
        return NextResponse.json(
          { error: 'Only completed courses can be submitted for credit transfer' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await tq.raw
      .from('credit_records')
      .insert({
        tenant_id: tenantId,
        student_id: authResult.user!.id,
        source_type: sourceType,
        issuing_tenant_id: sourceType === 'in_network' ? body.issuing_tenant_id : null,
        issuing_institution_name: String(body.issuing_institution_name).slice(0, 255),
        source_course_id: body.source_course_id || null,
        source_enrollment_id: body.source_enrollment_id || null,
        course_title: String(body.course_title).slice(0, 500),
        course_code: body.course_code ? String(body.course_code).slice(0, 50) : null,
        credits,
        grade: body.grade ? String(body.grade).slice(0, 10) : null,
        grade_scale: body.grade_scale ? String(body.grade_scale).slice(0, 50) : null,
        completion_date: body.completion_date || null,
        evidence_url: body.evidence_url ? String(body.evidence_url).slice(0, 1000) : null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already submitted this enrollment for review' },
          { status: 409 }
        );
      }
      console.error('Credit record insert error:', error);
      return NextResponse.json({ error: 'Failed to submit credit record' }, { status: 500 });
    }

    return NextResponse.json({ record: data }, { status: 201 });
  } catch (error) {
    console.error('Credit records POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
