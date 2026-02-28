import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

/**
 * GET /api/courses/[id]/announcements/[announcementId]
 * Get a specific announcement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) {
  try {
    const { id: courseId, announcementId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Check access - use service client to avoid RLS recursion
    const isInstructor = await checkIsInstructor(serviceSupabase, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);
    const isEnrolled = await checkEnrollment(serviceSupabase, user.id, courseId);

    if (!isInstructor && !isAdmin && !isEnrolled) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Use service client to avoid RLS recursion (access already verified)
    const { data: announcement, error } = await serviceSupabase
      .from("course_announcements")
      .select(`
        *,
        author:users!course_announcements_author_id_fkey(id, name, email)
      `)
      .eq("id", announcementId)
      .eq("course_id", courseId)
      .single();

    if (error || !announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    // Check if expired (unless instructor/admin)
    if (!isInstructor && !isAdmin) {
      if (announcement.expires_at && new Date(announcement.expires_at) < new Date()) {
        return NextResponse.json({ error: "Announcement has expired" }, { status: 404 });
      }
    }

    // Mark as viewed if student
    if (isEnrolled && !isInstructor && !isAdmin) {
      await serviceSupabase
        .from('announcement_views')
        .upsert({
          announcement_id: announcementId,
          user_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'announcement_id,user_id'
        })
        .then(({ error: viewErr }) => { if (viewErr) console.error('Failed to mark as viewed:', viewErr); });
    }

    return NextResponse.json(announcement);

  } catch (error: any) {
    console.error("Announcement GET API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/courses/[id]/announcements/[announcementId]
 * Update an announcement
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) {
  try {
    const { id: courseId, announcementId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Check if user is instructor/admin - use service client to avoid RLS recursion
    const isInstructor = await checkIsInstructor(serviceSupabase, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Only instructors and admins can update announcements" }, { status: 403 });
    }

    // Check if announcement exists and user owns it - use service client
    const { data: existing } = await serviceSupabase
      .from("course_announcements")
      .select("author_id")
      .eq("id", announcementId)
      .eq("course_id", courseId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    if (existing.author_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "You can only update your own announcements" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, is_pinned, attachment_url, attachment_name, scheduled_for, expires_at } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (attachment_url !== undefined) updateData.attachment_url = attachment_url || null;
    if (attachment_name !== undefined) updateData.attachment_name = attachment_name || null;
    if (scheduled_for !== undefined) updateData.scheduled_for = scheduled_for || null;
    if (expires_at !== undefined) updateData.expires_at = expires_at || null;

    // Use service client for update to avoid RLS recursion
    const { data: announcement, error } = await serviceSupabase
      .from("course_announcements")
      .update(updateData)
      .eq("id", announcementId)
      .eq("course_id", courseId)
      .select(`
        *,
        author:users!course_announcements_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating announcement:", error);
      return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
    }

    return NextResponse.json(announcement);

  } catch (error: any) {
    console.error("Announcement PUT API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[id]/announcements/[announcementId]
 * Delete an announcement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) {
  try {
    const { id: courseId, announcementId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Check if user is instructor/admin - use service client to avoid RLS recursion
    const isInstructor = await checkIsInstructor(serviceSupabase, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Only instructors and admins can delete announcements" }, { status: 403 });
    }

    // Check if announcement exists and user owns it - use service client
    const { data: existing } = await serviceSupabase
      .from("course_announcements")
      .select("author_id")
      .eq("id", announcementId)
      .eq("course_id", courseId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    if (existing.author_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "You can only delete your own announcements" }, { status: 403 });
    }

    // Use service client for delete to avoid RLS recursion
    const { error } = await serviceSupabase
      .from("course_announcements")
      .delete()
      .eq("id", announcementId)
      .eq("course_id", courseId);

    if (error) {
      console.error("Error deleting announcement:", error);
      return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Announcement deleted" });

  } catch (error: any) {
    console.error("Announcement DELETE API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper functions
async function checkIsInstructor(supabase: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await supabase
    .from('course_instructors')
    .select('id')
    .eq('course_id', courseId)
    .eq('instructor_id', userId)
    .single();
  return !!data;
}

async function checkEnrollment(supabase: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .single();
  return !!data;
}

