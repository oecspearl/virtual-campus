import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

// Minimal rules: static XP per event type for MVP
const XP_RULES: Record<string, number> = {
  daily_login: 5,
  lesson_completed: 25,
  quiz_attempted: 10,
  quiz_passed: 40,
  assignment_submitted: 30,
  discussion_posted: 5,
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.eventType !== 'string') {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const eventType: string = body.eventType;
    const xp = XP_RULES[eventType] ?? 0;
    if (xp <= 0) {
      return NextResponse.json({ error: "Unknown or non-rewarded event" }, { status: 400 });
    }

    // Insert into ledger
    const { data: ledger, error: ledgerError } = await supabase
      .from('gamification_xp_ledger')
      .insert([{
        user_id: user.id,
        event_type: eventType,
        event_id: body.eventId ?? null,
        course_id: body.courseId ?? null,
        lesson_id: body.lessonId ?? null,
        xp_delta: xp,
        reason: body.reason ?? null,
        metadata: body.metadata ?? {},
      }])
      .select()
      .single();

    if (ledgerError) {
      console.error('Gamification ledger insert error:', ledgerError);
      return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
    }

    // Upsert profile
    // 1) Fetch current
    const { data: profile } = await supabase
      .from('gamification_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const xpTotal = (profile?.xp_total ?? 0) + xp;
    // level: 1 per 1000 xp
    const level = Math.max(1, Math.floor(xpTotal / 1000));
    // streak MVP: if day changed vs last_active_at, +1 else keep
    const lastActive = profile?.last_active_at ? new Date(profile.last_active_at) : null;
    const today = new Date();
    let streak = profile?.streak_count ?? 0;
    if (!lastActive) streak = 1; else {
      const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (24*60*60*1000));
      if (daysDiff === 0) {
        // same day, keep
      } else if (daysDiff === 1) {
        streak = streak + 1;
      } else if (daysDiff > 1) {
        streak = 1; // reset
      }
    }

    const { error: upsertError } = await supabase
      .from('gamification_profiles')
      .upsert({
        user_id: user.id,
        xp_total: xpTotal,
        level,
        streak_count: streak,
        last_active_at: today.toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Gamification profile upsert error:', upsertError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, xpAwarded: xp, ledger });
  } catch (e: any) {
    console.error('Gamification event POST error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


