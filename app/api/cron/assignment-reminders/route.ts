import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { notifyAssignmentDue } from "@/lib/notifications";
import { withCronLock } from "@/lib/cron-lock";

/**
 * Assignment Due Reminders Cron Job
 *
 * GET /api/cron/assignment-reminders
 *
 * Checks for assignments due within 48 hours and sends reminder emails.
 * Protected by CRON_SECRET and distributed lock (prevents duplicate runs).
 *
 * Recommended: Run daily at 8 AM
 */

export async function GET(request: NextRequest) {
  return withCronLock('assignment-reminders', request, async () => {
    const serviceSupabase = createServiceSupabaseClient();

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
      throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
    }

    if (!assignments || assignments.length === 0) {
      return { processed: 0, sent: 0, failed: 0, message: 'No assignments due soon' };
    }

    const results = { processed: 0, sent: 0, failed: 0, errors: [] as string[] };

    for (const assignment of assignments) {
      try {
        const { data: enrollments } = await serviceSupabase
          .from('enrollments')
          .select('student_id')
          .eq('course_id', assignment.course_id)
          .eq('status', 'active');

        if (!enrollments || enrollments.length === 0) continue;

        const dueDate = new Date(assignment.due_date);
        const hoursRemaining = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        const timeRemaining = hoursRemaining < 24
          ? `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`
          : `${Math.floor(hoursRemaining / 24)} day${Math.floor(hoursRemaining / 24) !== 1 ? 's' : ''}`;

        const courseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org'}/courses/${assignment.course_id}`;
        const assignmentUrl = `${courseUrl}/assignments/${assignment.id}`;
        const dueDateStr = dueDate.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });

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
              results.errors.push(`Student ${enrollment.student_id}: ${result.error}`);
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push(`Student ${enrollment.student_id}: ${error.message}`);
          }
        }

        results.processed++;
      } catch (error: any) {
        results.errors.push(`Assignment ${assignment.id}: ${error.message}`);
      }
    }

    return results;
  });
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
