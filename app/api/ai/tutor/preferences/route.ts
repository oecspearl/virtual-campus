import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from "@/lib/database-helpers";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: preferences, error } = await tq
      .from("ai_tutor_preferences")
      .select("*")
      .eq("student_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching AI tutor preferences:', error);
      return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }

    // Return default preferences if none exist
    const defaultPreferences = {
      isEnabled: false,
      preferredStyle: 'balanced',
      learningFocus: 'general',
      autoActivate: false
    };

    return NextResponse.json({
      success: true,
      preferences: preferences || defaultPreferences
    });

  } catch (e: any) {
    console.error('AI tutor preferences GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const preferences = await request.json();
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Upsert preferences (insert or update)
    const { data, error } = await tq
      .from("ai_tutor_preferences")
      .upsert([{
        student_id: user.id,
        is_enabled: preferences.isEnabled,
        preferred_style: preferences.preferredStyle,
        learning_focus: preferences.learningFocus,
        auto_activate: preferences.autoActivate,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'student_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving AI tutor preferences:', error);
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        isEnabled: data.is_enabled,
        preferredStyle: data.preferred_style,
        learningFocus: data.learning_focus,
        autoActivate: data.auto_activate
      }
    });

  } catch (e: any) {
    console.error('AI tutor preferences POST API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
