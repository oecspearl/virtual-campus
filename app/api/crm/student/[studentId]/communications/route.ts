import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/student/[studentId]/communications
 * Unified communication history: campaign emails + interactions of type 'email'.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Fetch campaign emails sent to this student
    const { data: campaignEmails } = await tq
      .from('crm_campaign_recipients')
      .select('*, crm_campaigns(name, subject, status)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    // Fetch email interactions logged for this student
    const { data: emailInteractions } = await tq
      .from('crm_interactions')
      .select('*, users!crm_interactions_created_by_fkey(name)')
      .eq('student_id', studentId)
      .eq('interaction_type', 'email')
      .order('created_at', { ascending: false });

    // Fetch system email notifications
    const { data: systemEmails } = await tq
      .from('email_notifications')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Merge into unified timeline
    const timeline: any[] = [];

    for (const ce of campaignEmails || []) {
      timeline.push({
        type: 'campaign',
        id: ce.id,
        subject: ce.crm_campaigns?.subject || 'Campaign Email',
        campaign_name: ce.crm_campaigns?.name || null,
        status: ce.status,
        email: ce.email,
        sent_at: ce.sent_at,
        opened_at: ce.opened_at,
        date: ce.sent_at || ce.created_at,
      });
    }

    for (const ei of emailInteractions || []) {
      timeline.push({
        type: 'interaction',
        id: ei.id,
        subject: ei.subject,
        body: ei.body,
        created_by_name: ei.users?.name || null,
        date: ei.created_at,
      });
    }

    for (const se of systemEmails || []) {
      timeline.push({
        type: 'system_email',
        id: se.id,
        subject: se.subject,
        notification_type: se.type,
        status: se.status,
        date: se.sent_at || se.created_at,
      });
    }

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ communications: timeline });
  } catch (error: any) {
    console.error('CRM Communications: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
