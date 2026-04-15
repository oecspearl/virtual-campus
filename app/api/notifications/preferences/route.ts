import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { withTenantAuth } from "@/lib/with-tenant-auth";

/**
 * Notification Preferences API
 *
 * GET /api/notifications/preferences - Get user preferences
 * PUT /api/notifications/preferences - Update user preferences
 */
export const GET = withTenantAuth(async ({ user }) => {
  const serviceSupabase = await createServiceSupabaseClient();

  // Get or create preferences
  let { data: preferences, error } = await serviceSupabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // Create default preferences if not exists
    const { data: newPrefs, error: createError } = await serviceSupabase
      .from('notification_preferences')
      .insert({
        user_id: user.id,
        email_enabled: true,
        in_app_enabled: true,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: "Failed to create preferences" }, { status: 500 });
    }

    preferences = newPrefs;
  } else if (error) {
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    preferences: preferences || null,
  });
});

export const PUT = withTenantAuth(async ({ user, request }) => {
  const body = await request.json();
  const serviceSupabase = await createServiceSupabaseClient();

  // Check if preferences exist
  const { data: existing } = await serviceSupabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', user.id)
    .single();

  let result;
  if (existing) {
    // Update existing
    const { data, error } = await serviceSupabase
      .from('notification_preferences')
      .update({
        email_enabled: body.email_enabled,
        in_app_enabled: body.in_app_enabled,
        sms_enabled: body.sms_enabled,
        whatsapp_enabled: body.whatsapp_enabled,
        push_enabled: body.push_enabled,
        phone_number: body.phone_number,
        whatsapp_number: body.whatsapp_number,
        preferences: body.preferences,
        quiet_hours_start: body.quiet_hours_start,
        quiet_hours_end: body.quiet_hours_end,
        digest_frequency: body.digest_frequency,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }

    result = data;
  } else {
    // Create new
    const { data, error } = await serviceSupabase
      .from('notification_preferences')
      .insert({
        user_id: user.id,
        email_enabled: body.email_enabled ?? true,
        in_app_enabled: body.in_app_enabled ?? true,
        sms_enabled: body.sms_enabled ?? false,
        whatsapp_enabled: body.whatsapp_enabled ?? false,
        push_enabled: body.push_enabled ?? false,
        phone_number: body.phone_number,
        whatsapp_number: body.whatsapp_number,
        preferences: body.preferences,
        quiet_hours_start: body.quiet_hours_start,
        quiet_hours_end: body.quiet_hours_end,
        digest_frequency: body.digest_frequency || 'daily',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create preferences" }, { status: 500 });
    }

    result = data;
  }

  return NextResponse.json({
    success: true,
    preferences: result,
  });
});
