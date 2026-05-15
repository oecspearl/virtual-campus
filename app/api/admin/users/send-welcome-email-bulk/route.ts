import { NextRequest, NextResponse } from "next/server";
import { getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';
import { enqueueJob } from '@/lib/qstash';

/**
 * POST /api/admin/users/send-welcome-email-bulk
 * Enqueue welcome-email jobs for multiple users.
 *
 * Each user is processed asynchronously by /api/jobs/send-welcome-email
 * via QStash. We return 202 immediately so the request never times out,
 * even for hundreds of users.
 *
 * Body: { userIds: string[] }   (cap: 100 per request)
 */

const MAX_USERS_PER_REQUEST = 100;

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "User IDs array is required" }, { status: 400 });
    }

    if (userIds.length > MAX_USERS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Too many users in one request. Maximum is ${MAX_USERS_PER_REQUEST}. Split the list and submit in batches.`,
          limit: MAX_USERS_PER_REQUEST,
          provided: userIds.length,
        },
        { status: 400 },
      );
    }

    const tenantId = getTenantIdFromRequest(request);

    const enqueueResults = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          // Deterministic dedupe key: same admin double-clicking won't double-enqueue.
          const deduplicationId = `welcome-email:${tenantId}:${userId}`;
          const messageId = await enqueueJob({
            path: '/api/jobs/send-welcome-email',
            body: { userId, tenantId },
            deduplicationId,
            retries: 3,
          });
          return { userId, queued: messageId !== null, messageId };
        } catch (err: any) {
          return { userId, queued: false, error: err?.message || 'Enqueue failed' };
        }
      }),
    );

    const queued = enqueueResults.filter((r) => r.queued).length;
    const failed = enqueueResults.length - queued;

    return NextResponse.json(
      {
        success: true,
        message: `Queued ${queued} welcome email(s); ${failed} failed to enqueue.`,
        total: userIds.length,
        queued,
        failed,
        results: enqueueResults,
      },
      { status: 202 },
    );
  } catch (error: any) {
    console.error('Bulk send welcome email API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
