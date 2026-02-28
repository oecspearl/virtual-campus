import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { notifyAssignmentDue } from "@/lib/notifications";

/**
 * Assignment Due Reminders Cron Job
 * 
 * GET /api/cron/assignment-reminders
 * 
 * Checks for assignments due soon and sends reminder emails to students
 * 
 * This can be scheduled using:
 * - Vercel Cron Jobs
 * - GitHub Actions (scheduled workflow)
 * - External cron service (e.g., cron-job.org)
 * - Heroku Scheduler
 * 
 * Recommended: Run daily at 8 AM
 */

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceSupabaseClient();
    
    // Get current date/time and future dates for reminder windows
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    // Get assignments due in the next 2 days that are published
    const { data: assignments, error: assignmentsError } = await serviceSupabase
      .from('assignments')
      .select(`
        id,
        title,
        due_date,
        course_id,
        courses!inner(id, title)
      `)
      .eq('published', true)
      .not('due_date', 'is', null)
      .gte('due_date', now.toISOString())
      .lte('due_date', dayAfterTomorrow.toISOString());

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ 
        message: "No assignments due soon",
        processed: 0 
      });
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // For each assignment, get enrolled students and send reminders
    for (const assignment of assignments) {
      try {
        // Get enrolled students
        const { data: enrollments, error: enrollmentsError } = await serviceSupabase
          .from('enrollments')
          .select('student_id')
          .eq('course_id', assignment.course_id)
          .eq('status', 'active');

        if (enrollmentsError || !enrollments || enrollments.length === 0) {
          continue; // Skip this assignment if no students
        }

        // Calculate time remaining
        const dueDate = new Date(assignment.due_date);
        const hoursRemaining = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        let timeRemaining = '';
        if (hoursRemaining < 24) {
          timeRemaining = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
        } else {
          const days = Math.floor(hoursRemaining / 24);
          timeRemaining = `${days} day${days !== 1 ? 's' : ''}`;
        }

        // Get course and assignment URLs
        const courseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org'}/courses/${assignment.course_id}`;
        const assignmentUrl = `${courseUrl}/assignments/${assignment.id}`;

        // Format due date
        const dueDateStr = dueDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Send reminder to each enrolled student
        for (const enrollment of enrollments) {
          try {
            const result = await notifyAssignmentDue(enrollment.student_id, {
              assignmentName: assignment.title,
              courseTitle: (assignment.courses as any)?.title || 'Course',
              dueDate: dueDateStr,
              timeRemaining,
              assignmentUrl,
            });

            if (result.success) {
              results.sent++;
            } else {
              results.failed++;
              results.errors.push(`Failed to send to student ${enrollment.student_id}: ${result.error}`);
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push(`Error sending to student ${enrollment.student_id}: ${error.message}`);
          }
        }

        results.processed++;
      } catch (error: any) {
        console.error(`Error processing assignment ${assignment.id}:`, error);
        results.errors.push(`Assignment ${assignment.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} assignments`,
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Assignment reminders cron error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message 
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

