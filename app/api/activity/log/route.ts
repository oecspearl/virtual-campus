import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { withTenantAuth } from "@/lib/with-tenant-auth";

export const POST = withTenantAuth(async ({ user, request }) => {
  const body = await request.json();
  const {
    courseId,
    activityType,
    itemId,
    itemType,
    action,
    metadata = {}
  } = body;

  // Validate required fields
  if (!activityType || !action) {
    return NextResponse.json({
      error: "activityType and action are required"
    }, { status: 400 });
  }

  // Get IP address and user agent from request
  const ipAddress = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    null;
  const userAgent = request.headers.get('user-agent') || null;

  const serviceSupabase = createServiceSupabaseClient();

  // Insert activity log
  const { data: logEntry, error } = await serviceSupabase
    .from('student_activity_log')
    .insert({
      student_id: user.id,
      course_id: courseId || null,
      activity_type: activityType,
      item_id: itemId || null,
      item_type: itemType || null,
      action: action,
      metadata: metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (error) {
    console.error('Activity log insert error:', error);
    return NextResponse.json({
      error: "Failed to log activity"
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    logEntry
  });
});
