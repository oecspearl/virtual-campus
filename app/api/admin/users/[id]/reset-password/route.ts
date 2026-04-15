import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { password } = await request.json();

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

    if (!password || password.trim() === '') {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Update user password in Supabase Auth
    const { error: authError } = await tq.raw.auth.admin.updateUserById(id, {
      password: password
    });

    if (authError) {
      console.error('Password reset error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Password reset successfully" 
    });

  } catch (error) {
    console.error('Admin password reset API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
