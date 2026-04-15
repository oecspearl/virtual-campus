import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { withTenantAuth } from "@/lib/with-tenant-auth";

export const GET = withTenantAuth(async ({ user }) => {
  const supabase = createServiceSupabaseClient();
  const { data: profile, error } = await supabase
    .from('gamification_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('tenant_id', user.tenant_id || '00000000-0000-0000-0000-000000000001')
    .single();

  if (error && error.code !== 'PGRST116') { // not found is ok
    console.error('Gamification profile fetch error:', error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }

  return NextResponse.json({
    userId: user.id,
    xpTotal: profile?.xp_total ?? 0,
    level: profile?.level ?? 1,
    streakCount: profile?.streak_count ?? 0,
    lastActiveAt: profile?.last_active_at ?? null,
  });
});
