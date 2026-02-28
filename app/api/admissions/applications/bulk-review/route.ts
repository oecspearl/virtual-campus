import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { bulkReview } from '@/lib/admissions/admission-service';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { application_ids, decision, notes } = await request.json();

    if (!Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json({ error: 'application_ids array is required' }, { status: 400 });
    }

    if (!['approved', 'rejected', 'waitlisted', 'under_review'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const result = await bulkReview(
      application_ids,
      decision,
      authResult.userProfile.id,
      notes
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bulk review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
