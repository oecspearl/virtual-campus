import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { sendCampaign } from '@/lib/crm/campaign-service';

/**
 * POST /api/crm/campaigns/[id]/send
 * Trigger campaign send (admin+ only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden: admin access required to send campaigns' }, { status: 403 });
    }

    const result = await sendCampaign(id);

    return NextResponse.json({
      success: true,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error: any) {
    console.error('CRM Campaign Send: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
