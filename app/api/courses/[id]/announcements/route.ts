import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";
import { notifyCourseAnnouncement } from "@/lib/notifications";

/**
 * GET /api/courses/[id]/announcements
 * Get all announcements for a course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Check if user has access to this course
    // Use service client for enrollment check to avoid RLS recursion
    const isInstructor = await checkIsInstructor(serviceSupabase, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);
    const isEnrolled = await checkEnrollment(serviceSupabase, user.id, courseId);

    if (!isInstructor && !isAdmin && !isEnrolled) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get("include_expired") === "true";

    // Use service client for query to avoid RLS recursion
    // (We've already verified access above)
    let query = serviceSupabase
      .from("course_announcements")
      .select(`
        *,
        author:users!course_announcements_author_id_fkey(id, name, email)
      `)
      .eq("course_id", courseId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // Filter out expired announcements unless requested
    if (!includeExpired) {
      query = query.or("expires_at.is.null,expires_at.gt." + new Date().toISOString());
    }

    // Filter out scheduled announcements that haven't been published yet
    const now = new Date().toISOString();
    query = query.or(`scheduled_for.is.null,scheduled_for.lte.${now}`);

    const { data: announcements, error } = await query;

    if (error) {
      console.error("Error fetching announcements:", error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: "Announcements table not found. Please run the database migration first.",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
      }
      return NextResponse.json({ 
        error: "Failed to fetch announcements",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    // If student, mark announcements as viewed and get view counts
    if (!isInstructor && !isAdmin && isEnrolled) {
      const serviceSupabase = createServiceSupabaseClient();
      
      // Mark all visible announcements as viewed (async, don't wait)
      if (announcements && announcements.length > 0) {
        Promise.all(
          announcements.map(announcement => 
            serviceSupabase
              .from('announcement_views')
              .upsert({
                announcement_id: announcement.id,
                user_id: user.id,
                viewed_at: new Date().toISOString(),
              }, {
                onConflict: 'announcement_id,user_id'
              })
              .then(({ error: viewErr }) => { if (viewErr) console.error(`Failed to mark announcement ${announcement.id} as viewed:`, viewErr); })
          )
        ).catch(err => console.error('Error marking announcements as viewed:', err));
      }
    }

    return NextResponse.json({ announcements: announcements || [] });

  } catch (error: any) {
    console.error("Announcements GET API error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    return NextResponse.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}

/**
 * POST /api/courses/[id]/announcements
 * Create a new announcement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Check if user is instructor/admin
    // Use service client to avoid RLS recursion
    const isInstructor = await checkIsInstructor(serviceSupabase, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Only instructors and admins can create announcements" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, is_pinned = false, attachment_url, attachment_name, scheduled_for, expires_at } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Create announcement using service client to avoid RLS recursion
    // (We've already verified access above)
    const { data: announcement, error } = await serviceSupabase
      .from("course_announcements")
      .insert([{
        course_id: courseId,
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
        is_pinned: is_pinned || false,
        attachment_url: attachment_url || null,
        attachment_name: attachment_name || null,
        scheduled_for: scheduled_for || null,
        expires_at: expires_at || null,
      }])
      .select(`
        *,
        author:users!course_announcements_author_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error creating announcement:", error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: "Announcements table not found. Please run the database migration first.",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
      }
      return NextResponse.json({ 
        error: "Failed to create announcement",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    // Send notification to all enrolled students (in background)
    if (announcement && (!scheduled_for || new Date(scheduled_for) <= new Date())) {
      const { data: course } = await serviceSupabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();

      if (course) {
        const { data: enrollments } = await serviceSupabase
          .from('enrollments')
          .select('student_id')
          .eq('course_id', courseId)
          .eq('status', 'active');

        if (enrollments && enrollments.length > 0) {
          const courseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org'}/courses/${courseId}`;
          const announcementUrl = `${courseUrl}/announcements`;
          
          // Strip HTML from content for email (first 200 chars)
          const plainContent = content.replace(/<[^>]*>/g, '').substring(0, 200);
          
          // Send notifications in background with rate limiting
          // Resend allows 2 requests per second, so we delay each email by 500ms
          (async () => {
            let successCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < enrollments.length; i++) {
              const enrollment = enrollments[i];
              
              // Delay to respect rate limit (2 requests/second = 500ms between requests)
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 550));
              }
              
              try {
                const result = await notifyCourseAnnouncement(enrollment.student_id, {
                  courseTitle: course.title,
                  announcementTitle: title,
                  announcementContent: plainContent,
                  courseUrl: announcementUrl,
                });
                
                if (result.success) {
                  successCount++;
                } else {
                  errorCount++;
                  console.error(`Failed to notify student ${enrollment.student_id}:`, result.error);
                }
              } catch (err: any) {
                errorCount++;
                console.error(`Failed to notify student ${enrollment.student_id}:`, err.message || err);
              }
            }
            
            console.log(`Announcement notifications sent: ${successCount} successful, ${errorCount} failed`);
          })().catch(err => console.error('Error in announcement notification queue:', err));
        }
      }
    }

    return NextResponse.json(announcement);

  } catch (error: any) {
    console.error("Announcements POST API error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    return NextResponse.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
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

