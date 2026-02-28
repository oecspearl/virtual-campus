import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { sendEmail, replaceTemplateVariables } from "@/lib/email-service";

/**
 * Email Notification API
 * 
 * POST /api/notifications/email/send
 * 
 * Send email notification to users
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins, instructors, and system can send emails
    const allowedRoles = ['admin', 'super_admin', 'instructor', 'curriculum_designer'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      type, 
      userIds, 
      emailAddresses,
      subject,
      html,
      templateId,
      templateVariables 
    } = body;

    if (!type) {
      return NextResponse.json({ error: "Notification type is required" }, { status: 400 });
    }

    const serviceSupabase = await createServiceSupabaseClient();

    // Get email template if templateId provided
    let template = null;
    if (templateId) {
      const { data: templateData, error: templateError } = await serviceSupabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (templateError || !templateData) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      template = templateData;
    } else if (type) {
      // Get template by type
      const { data: templateData } = await serviceSupabase
        .from('email_templates')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      template = templateData;
    }

    // Get user emails if userIds provided
    let recipients: string[] = [];
    if (userIds && userIds.length > 0) {
      const { data: users, error: usersError } = await serviceSupabase
        .from('user_profiles')
        .select('id, email, name')
        .in('id', userIds);

      if (usersError) {
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
      }

      recipients = users?.map(u => u.email).filter(Boolean) || [];
    } else if (emailAddresses && emailAddresses.length > 0) {
      recipients = emailAddresses;
    } else {
      return NextResponse.json({ error: "userIds or emailAddresses required" }, { status: 400 });
    }

    // Check notification preferences for each user
    const results = [];
    for (const recipientEmail of recipients) {
      try {
        // Get user ID from email
        const { data: userProfile } = await serviceSupabase
          .from('user_profiles')
          .select('id, name')
          .eq('email', recipientEmail)
          .single();

        const userId = userProfile?.id;

        // Check preferences if user found
        if (userId) {
          const { data: preferences } = await serviceSupabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

          // Check if email is enabled and this notification type is allowed
          if (preferences && preferences.email_enabled !== false) {
            const pref = preferences.preferences?.[type];
            if (pref && pref.email === false) {
              results.push({
                email: recipientEmail,
                success: false,
                skipped: true,
                reason: 'User has disabled email notifications for this type'
              });
              continue;
            }
          }
        }

        // Prepare email content
        let emailSubject = subject || template?.subject_template || 'Notification';
        let emailHtml = html || '';
        let emailText = template?.body_text_template || '';

        // Use template if available
        if (template && !html) {
          emailSubject = replaceTemplateVariables(template.subject_template, templateVariables || {});
          emailHtml = replaceTemplateVariables(template.body_html_template, templateVariables || {});
          emailText = template.body_text_template ? replaceTemplateVariables(template.body_text_template, templateVariables || {}) : '';
        } else if (templateVariables) {
          emailSubject = replaceTemplateVariables(emailSubject, templateVariables);
          emailHtml = replaceTemplateVariables(emailHtml, templateVariables);
          if (emailText) emailText = replaceTemplateVariables(emailText, templateVariables);
        }

        // Send email
        const emailResult = await sendEmail({
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
          tags: [{ name: 'notification_type', value: type }],
        });

        // Log notification
        if (userId) {
          await serviceSupabase
            .from('email_notifications')
            .insert({
              user_id: userId,
              type,
              subject: emailSubject,
              body_text: emailText,
              body_html: emailHtml,
              status: emailResult.success ? 'sent' : 'failed',
              sent_at: emailResult.success ? new Date().toISOString() : null,
              error_message: emailResult.error || null,
              metadata: {
                template_id: template?.id || null,
                template_variables: templateVariables || {},
              }
            });
        }

        results.push({
          email: recipientEmail,
          success: emailResult.success,
          error: emailResult.error,
          messageId: emailResult.messageId,
        });

      } catch (error: any) {
        console.error(`Error sending email to ${recipientEmail}:`, error);
        results.push({
          email: recipientEmail,
          success: false,
          error: error.message || 'Failed to send email',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.skipped).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: recipients.length,
        sent: successCount,
        failed: failCount,
        skipped: skippedCount,
      }
    });

  } catch (error: any) {
    console.error('Email notification API error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message 
    }, { status: 500 });
  }
}
