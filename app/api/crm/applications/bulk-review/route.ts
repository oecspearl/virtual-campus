import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { bulkReviewApplications } from '@/lib/crm/application-service';

/**
 * POST /api/crm/applications/bulk-review
 * Admin: bulk review multiple applications with the same status.
 * Body: { application_ids: string[], status: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return createAuthResponse(authResult.error || 'Unauthorized', authResult.status || 401);
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { application_ids, status, notes } = body;

    if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json(
        { error: 'application_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!status || !['approved', 'rejected', 'waitlisted'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: approved, rejected, waitlisted' },
        { status: 400 }
      );
    }

    const result = await bulkReviewApplications(
      application_ids,
      status,
      authResult.userProfile.id,
      notes
    );

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
    });
  } catch (error: any) {
    console.error('CRM Bulk Review POST: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
