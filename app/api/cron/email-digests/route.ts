import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sendEmail, wrapEmailTemplate } from "@/lib/email-service";

/**
 * Email Digest Cron Job
 * 
 * GET /api/cron/email-digests
 * 
 * Sends daily and weekly email digests to users who have them enabled
 * 
 * This should be scheduled:
 * - Daily digests: Run daily at 8 AM
 * - Weekly digests: Run weekly (e.g., Monday at 8 AM)
 * 
 * Can use:
 * - Vercel Cron Jobs
 * - GitHub Actions (scheduled workflow)
 * - External cron service
 * - Heroku Scheduler
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
    const now = new Date();
    
    // Determine digest type based on day of week or query param
    const url = new URL(request.url);
    const digestType = url.searchParams.get('type') || (now.getDay() === 1 ? 'weekly' : 'daily'); // Monday = weekly
    
    const results = {
      type: digestType,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get users with digest preferences enabled
    const { data: preferences, error: preferencesError } = await serviceSupabase
      .from('notification_preferences')
      .select('user_id, digest_frequency')
      .eq('email_enabled', true)
      .or(`digest_frequency.eq.${digestType},digest_frequency.eq.daily`); // Include daily for weekly too

    if (preferencesError) {
      console.error('Error fetching preferences:', preferencesError);
      return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }

    if (!preferences || preferences.length === 0) {
      return NextResponse.json({
        message: `No users with ${digestType} digest enabled`,
        processed: 0,
      });
    }

    // Calculate time range for notifications
    const startDate = new Date(now);
    if (digestType === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Weekly - last 7 days
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    // Process each user
    for (const pref of preferences) {
      // Skip if user has 'none' or different frequency
      if (pref.digest_frequency === 'none') {
        results.skipped++;
        continue;
      }
      
      if (digestType === 'weekly' && pref.digest_frequency !== 'weekly') {
        continue; // Skip daily users for weekly digest
      }

      try {
        // Get notifications for this user in the time period
        const { data: notifications, error: notificationsError } = await serviceSupabase
          .from('email_notifications')
          .select('*')
          .eq('user_id', pref.user_id)
          .eq('status', 'sent')
          .gte('sent_at', startDate.toISOString())
          .order('sent_at', { ascending: false })
          .limit(50); // Limit to 50 most recent

        if (notificationsError) {
          results.errors.push(`Failed to fetch notifications for user ${pref.user_id}`);
          continue;
        }

        if (!notifications || notifications.length === 0) {
          results.skipped++;
          continue; // No notifications to send
        }

        // Get user info
        const { data: user } = await serviceSupabase
          .from('users')
          .select('name, email')
          .eq('id', pref.user_id)
          .single();

        if (!user || !user.email) {
          results.errors.push(`User ${pref.user_id} email not found`);
          continue;
        }

        // Group notifications by type
        const notificationsByType: Record<string, any[]> = notifications.reduce((acc: Record<string, any[]>, notif: any) => {
          if (!acc[notif.type]) {
            acc[notif.type] = [];
          }
          acc[notif.type].push(notif);
          return acc;
        }, {} as Record<string, any[]>);

        // Build digest content
        const periodText = digestType === 'daily' ? 'today' : 'this week';
        const periodTitle = digestType === 'daily' ? 'Daily Digest' : 'Weekly Digest';
        
        let digestHtml = `
          <h2 style="color: #2563eb; margin-top: 0;">${periodTitle}</h2>
          <p>Hello ${user.name || 'there'},</p>
          <p>Here's a summary of your activity ${periodText}:</p>
        `;

        // Add notification summaries by type
        for (const [type, typeNotifications] of Object.entries(notificationsByType)) {
          const typeLabels: Record<string, string> = {
            'grade_posted': 'Grades',
            'assignment_due_reminder': 'Assignment Reminders',
            'course_announcement': 'Announcements',
            'discussion_reply': 'Discussion Replies',
            'enrollment_confirmation': 'Enrollments',
          };

          const typeLabel = typeLabels[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          const count = typeNotifications.length;

          digestHtml += `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">${typeLabel} (${count})</h3>
          `;

          // Show up to 5 most recent of each type
          for (const notif of typeNotifications.slice(0, 5)) {
            const metadata = notif.metadata || {};
            digestHtml += `
              <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                <div style="font-weight: 600; color: #374151;">${notif.subject}</div>
                ${notif.body_text ? `<div style="color: #6b7280; font-size: 14px; margin-top: 5px;">${notif.body_text.substring(0, 100)}${notif.body_text.length > 100 ? '...' : ''}</div>` : ''}
                <div style="color: #9ca3af; font-size: 12px; margin-top: 5px;">
                  ${notif.sent_at ? new Date(notif.sent_at).toLocaleString() : ''}
                </div>
              </div>
            `;
          }

          if (count > 5) {
            digestHtml += `<p style="color: #6b7280; font-size: 14px; margin-top: 10px;">And ${count - 5} more ${typeLabel.toLowerCase()}</p>`;
          }

          digestHtml += `</div>`;
        }

        digestHtml += `
          <p style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org'}/dashboard" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Dashboard
            </a>
          </p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            You can change your digest preferences at any time in your notification settings.
          </p>
        `;

        // Send digest email
        const subject = `${periodTitle} - ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`;
        
        const emailResult = await sendEmail({
          to: user.email,
          subject,
          html: wrapEmailTemplate(digestHtml, { title: periodTitle }),
          tags: [{ name: 'digest_type', value: digestType }],
        });

        if (emailResult.success) {
          // Log digest in email_digests table
          await serviceSupabase
            .from('email_digests')
            .insert({
              user_id: pref.user_id,
              digest_type: digestType,
              notification_ids: notifications.map(n => n.id),
              subject,
              body_html: digestHtml,
              status: 'sent',
              scheduled_for: now.toISOString(),
              sent_at: new Date().toISOString(),
            });

          results.sent++;
        } else {
          // Log failed digest
          await serviceSupabase
            .from('email_digests')
            .insert({
              user_id: pref.user_id,
              digest_type: digestType,
              notification_ids: notifications.map(n => n.id),
              subject,
              body_html: digestHtml,
              status: 'failed',
              scheduled_for: now.toISOString(),
            });

          results.failed++;
          results.errors.push(`Failed to send digest to ${user.email}: ${emailResult.error}`);
        }

        results.processed++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error processing user ${pref.user_id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} ${digestType} digests`,
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Email digest cron error:', error);
    return NextResponse.json({
      error: "Internal server error",
      message: error.message,
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

