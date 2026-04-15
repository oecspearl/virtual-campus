import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';
import { deleteUserCascade } from "@/lib/delete-user-cascade";

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Missing or empty userIds array" }, { status: 400 });
    }

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    // Prevent self-deletion
    if (userIds.includes(userProfile.id)) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let deleted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      const result = await deleteUserCascade(tq, userId);

      if (result.success) {
        deleted++;
      } else {
        failed++;
        errors.push(`${userId}: ${result.error}`);
      }
    }

    return NextResponse.json({
      message: `${deleted} user(s) deleted successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      deleted,
      failed,
      errors,
    });
  } catch (error) {
    console.error('Bulk delete API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
