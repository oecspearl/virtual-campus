import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, authorizeUser, createAuthResponse } from "@/lib/api-auth";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const auth = await authenticateUser(request);
  if (!auth.success) return createAuthResponse(auth.error!, auth.status!);

  const authz = await authorizeUser(auth.userProfile, ["super_admin"]);
  if (!authz.success) return createAuthResponse(authz.error!, authz.status!);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const serviceSupabase = createServiceSupabaseClient();

  // Search users by name or email
  const { data: users, error } = await serviceSupabase
    .from("users")
    .select("id, name, email, role, created_at")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .order("name")
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }

  // Get tenant memberships for found users
  const userIds = (users || []).map((u: any) => u.id);
  let memberships: any[] = [];

  if (userIds.length > 0) {
    const { data: membershipData } = await serviceSupabase
      .from("tenant_memberships")
      .select("user_id, tenant_id, role, tenants(name, slug)")
      .in("user_id", userIds);
    memberships = membershipData || [];
  }

  // Combine users with their tenant info
  const enrichedUsers = (users || []).map((user: any) => {
    const userMemberships = memberships
      .filter((m: any) => m.user_id === user.id)
      .map((m: any) => ({
        tenant_id: m.tenant_id,
        tenant_name: m.tenants?.name || "Unknown",
        tenant_slug: m.tenants?.slug || "",
        role: m.role,
      }));

    return {
      ...user,
      tenant_memberships: userMemberships,
    };
  });

  return NextResponse.json({ users: enrichedUsers });
}
