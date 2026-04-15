import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await request.json();

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

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Update enrollment
    const { data: enrollment, error: updateError } = await tq
      .from('enrollments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Enrollment updated successfully",
      enrollment 
    });

  } catch (error) {
    console.error('Admin enrollment PUT API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Delete enrollment
    const { error: deleteError } = await tq
      .from('enrollments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting enrollment:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Enrollment deleted successfully" 
    });

  } catch (error) {
    console.error('Admin enrollment DELETE API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
