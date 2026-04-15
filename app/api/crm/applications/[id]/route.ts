import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { reviewApplication } from '@/lib/crm/application-service';

/**
 * GET /api/crm/applications/[id]
 * Admin: get a single application with full details including fields, programme, campaign, and reviewer.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return createAuthResponse(authResult.error || 'Unauthorized', authResult.status || 401);
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Fetch the application
    const { data: application, error: appError } = await tq
      .from('programme_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Fetch application fields for this campaign
    const { data: fields } = await tq
      .from('programme_application_fields')
      .select('*')
      .eq('campaign_id', application.campaign_id)
      .order('order', { ascending: true });

    // Fetch programme details
    let programme = null;
    if (application.programme_id) {
      const { data: prog } = await tq
        .from('programmes')
        .select('*')
        .eq('id', application.programme_id)
        .single();

      programme = prog;
    }

    // Fetch campaign name
    let campaignName = null;
    if (application.campaign_id) {
      const { data: campaign } = await tq
        .from('crm_campaigns')
        .select('name')
        .eq('id', application.campaign_id)
        .single();

      campaignName = campaign?.name || null;
    }

    // Fetch reviewer name if reviewed
    let reviewerName = null;
    if (application.reviewed_by) {
      const { data: reviewer } = await tq
        .from('users')
        .select('name')
        .eq('id', application.reviewed_by)
        .single();

      reviewerName = reviewer?.name || null;
    }

    // Enrich answers with field details for the UI
    const rawAnswers = Array.isArray(application.answers) ? application.answers : [];
    const enrichedAnswers = rawAnswers.map((a: any) => {
      const field = (fields || []).find((f: any) => f.id === a.field_id);
      return {
        field_id: a.field_id,
        field_type: field?.type || 'text',
        question_text: field?.question_text || 'Unknown question',
        answer: a.value ?? a.answer ?? null,
        options: field?.options?.choices
          ? field.options.choices.map((c: string, idx: number) => ({ id: String(idx), text: c }))
          : null,
      };
    });

    // Return flat structure matching the UI's ApplicationDetail interface
    return NextResponse.json({
      id: application.id,
      applicant_name: application.applicant_name,
      applicant_email: application.applicant_email,
      programme_id: application.programme_id,
      programme_title: programme?.title || 'Unknown Programme',
      campaign_id: application.campaign_id,
      campaign_name: campaignName || 'Unknown Campaign',
      status: application.status,
      submitted_at: application.submitted_at,
      reviewed_by_name: reviewerName,
      reviewed_at: application.reviewed_at,
      review_notes: application.review_notes,
      answers: enrichedAnswers,
    });
  } catch (error: any) {
    console.error('CRM Application Detail GET: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/crm/applications/[id]
 * Admin: review an application (approve/reject/waitlist).
 * Body: { status: 'approved'|'rejected'|'waitlisted', review_notes?: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return createAuthResponse(authResult.error || 'Unauthorized', authResult.status || 401);
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, review_notes } = body;

    if (!status || !['approved', 'rejected', 'waitlisted'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: approved, rejected, waitlisted' },
        { status: 400 }
      );
    }

    const result = await reviewApplication(
      id,
      status,
      authResult.userProfile.id,
      review_notes
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Review failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, application: result.application });
  } catch (error: any) {
    console.error('CRM Application Review PUT: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
