import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: profile, error } = await supabase
      .from('gamification_profiles')
      .select('*')
      .eq('user_id', user.id)
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
  } catch (e: any) {
    console.error('Gamification profile GET error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


