/**
 * Notification Helper Functions
 * 
 * Utility functions for triggering notifications throughout the app
 */

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sendEmail, replaceTemplateVariables, wrapEmailTemplate } from "@/lib/email-service";

export type NotificationType =
  | 'grade_posted'
  | 'assignment_due_reminder'
  | 'course_announcement'
  | 'discussion_reply'
  | 'discussion_mention'
  | 'enrollment_confirmation'
  | 'course_enrollment'
  | 'student_welcome'
  | 'message_received';

export interface NotificationOptions {
  userId: string;
  type: NotificationType;
  subject?: string;
  html?: string;
  templateVariables?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Send notification to a user
 * Checks preferences and sends via email if enabled
 */
export async function sendNotification(options: NotificationOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceSupabase = await createServiceSupabaseClient();

    // Get user preferences
    const { data: preferences } = await serviceSupabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', options.userId)
      .single();

    // Check if email notifications are enabled for this user and type
    if (preferences && preferences.email_enabled !== false) {
      const typePref = preferences.preferences?.[options.type];
      if (typePref && typePref.email === false) {
        // User has disabled this notification type
        return { success: true }; // Not an error, just skipped
      }
    }

    // Get user email (email is in users table, not user_profiles)
    const { data: user } = await serviceSupabase
      .from('users')
      .select('email, name')
      .eq('id', options.userId)
      .single();

    if (!user?.email) {
      return { success: false, error: 'User email not found' };
    }

    // Get template
    const { data: template } = await serviceSupabase
      .from('email_templates')
      .select('*')
      .eq('type', options.type)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!template) {
      return { success: false, error: `Template not found for type: ${options.type}` };
    }

    // Prepare email content
    const subject = options.subject || replaceTemplateVariables(template.subject_template, options.templateVariables || {});
    const html = options.html || replaceTemplateVariables(template.body_html_template, options.templateVariables || {});
    const text = template.body_text_template ? replaceTemplateVariables(template.body_text_template, options.templateVariables || {}) : undefined;

    // Send email
    const emailResult = await sendEmail({
      to: user.email,
      subject,
      html: wrapEmailTemplate(html, { title: template.name }),
      text,
      tags: [{ name: 'notification_type', value: options.type }],
    });

    // Log notification
    await serviceSupabase
      .from('email_notifications')
      .insert({
        user_id: options.userId,
        type: options.type,
        subject,
        body_text: text,
        body_html: html,
        status: emailResult.success ? 'sent' : 'failed',
        sent_at: emailResult.success ? new Date().toISOString() : null,
        error_message: emailResult.error || null,
        metadata: options.metadata || {},
      });

    return {
      success: emailResult.success,
      error: emailResult.error,
    };

  } catch (error: any) {
    console.error('Notification send error:', error);
    return { success: false, error: error.message || 'Failed to send notification' };
  }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkNotifications(
  userIds: string[],
  type: NotificationType,
  templateVariables?: Record<string, any>
): Promise<Array<{ userId: string; success: boolean; error?: string }>> {
  const results = [];

  for (const userId of userIds) {
    const result = await sendNotification({
      userId,
      type,
      templateVariables,
    });
    results.push({ userId, ...result });
  }

  return results;
}

/**
 * Send grade posted notification
 */
export async function notifyGradePosted(
  userId: string,
  options: {
    assignmentName: string;
    courseTitle: string;
    score: number;
    totalPoints: number;
    percentage: number;
    feedback?: string;
    courseUrl: string;
  }
) {
  const student = await getUserProfile(userId);
  
  return sendNotification({
    userId,
    type: 'grade_posted',
    templateVariables: {
      student_name: student?.name || 'Student',
      assignment_name: options.assignmentName,
      course_title: options.courseTitle,
      score: options.score,
      total_points: options.totalPoints,
      percentage: `${options.percentage}%`,
      feedback: options.feedback || '',
      course_url: options.courseUrl,
    },
    metadata: {
      assignment_name: options.assignmentName,
      course_title: options.courseTitle,
      score: options.score,
      total_points: options.totalPoints,
    },
  });
}

/**
 * Send assignment due reminder
 */
export async function notifyAssignmentDue(
  userId: string,
  options: {
    assignmentName: string;
    courseTitle: string;
    dueDate: string;
    timeRemaining?: string;
    assignmentUrl: string;
  }
) {
  const student = await getUserProfile(userId);
  
  return sendNotification({
    userId,
    type: 'assignment_due_reminder',
    templateVariables: {
      student_name: student?.name || 'Student',
      assignment_name: options.assignmentName,
      course_title: options.courseTitle,
      due_date: options.dueDate,
      time_remaining: options.timeRemaining || '',
      assignment_url: options.assignmentUrl,
    },
  });
}

/**
 * Send enrollment confirmation
 */
export async function notifyEnrollment(
  userId: string,
  options: {
    courseTitle: string;
    courseUrl: string;
  }
) {
  const student = await getUserProfile(userId);
  
  return sendNotification({
    userId,
    type: 'enrollment_confirmation',
    templateVariables: {
      student_name: student?.name || 'Student',
      course_title: options.courseTitle,
      course_url: options.courseUrl,
    },
  });
}

/**
 * Send course announcement notification
 */
export async function notifyCourseAnnouncement(
  userId: string,
  options: {
    courseTitle: string;
    announcementTitle: string;
    announcementContent: string;
    courseUrl: string;
  }
) {
  const student = await getUserProfile(userId);
  
  return sendNotification({
    userId,
    type: 'course_announcement',
    templateVariables: {
      student_name: student?.name || 'Student',
      course_title: options.courseTitle,
      announcement_title: options.announcementTitle,
      announcement_content: options.announcementContent,
      course_url: options.courseUrl,
    },
  });
}

/**
 * Send discussion reply notification
 */
export async function notifyDiscussionReply(
  userId: string,
  options: {
    replyAuthorName: string;
    discussionTitle: string;
    courseTitle: string;
    replyContent: string;
    discussionUrl: string;
  }
) {
  const user = await getUserProfile(userId);
  
  return sendNotification({
    userId,
    type: 'discussion_reply',
    templateVariables: {
      user_name: user?.name || 'User',
      reply_author_name: options.replyAuthorName,
      discussion_title: options.discussionTitle,
      course_title: options.courseTitle,
      reply_content: options.replyContent,
      discussion_url: options.discussionUrl,
    },
  });
}

/**
 * Send student welcome email (first-time access)
 */
export async function notifyStudentWelcome(
  userId: string,
  options: {
    temporaryPassword: string;
    platformUrl?: string;
    loginUrl?: string;
    helpUrl?: string;
  }
) {
  const student = await getUserProfile(userId);
  const platformUrl = options.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org';
  const loginUrl = options.loginUrl || `${platformUrl}/auth/signin`;
  const helpUrl = options.helpUrl || `${platformUrl}/help/student`;
  
  return sendNotification({
    userId,
    type: 'student_welcome',
    templateVariables: {
      student_name: student?.name || 'Student',
      student_email: student?.email || '',
      temporary_password: options.temporaryPassword,
      platform_url: platformUrl,
      login_url: loginUrl,
      help_url: helpUrl,
    },
    metadata: {
      is_first_access: true,
      welcome_email_sent: true,
    },
  });
}

/**
 * Helper to get user profile (name and email from users table)
 */
async function getUserProfile(userId: string) {
  const serviceSupabase = await createServiceSupabaseClient();
  const { data } = await serviceSupabase
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .single();
  return data;
}

/**
 * Create an in-app notification
 */
export async function createInAppNotification(options: {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceSupabase = createServiceSupabaseClient();

    const { error } = await serviceSupabase
      .from('in_app_notifications')
      .insert({
        user_id: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        link_url: options.linkUrl || null,
        metadata: options.metadata || {},
        is_read: false,
      });

    if (error) {
      console.error('Error creating in-app notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('In-app notification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send new message notification (email + in-app)
 */
export async function notifyNewMessage(
  recipientId: string,
  options: {
    senderName: string;
    senderId: string;
    messagePreview: string;
    roomId: string;
    roomName?: string;
    isGroupChat: boolean;
  }
): Promise<{ email: { success: boolean; error?: string }; inApp: { success: boolean; error?: string } }> {
  const recipient = await getUserProfile(recipientId);
  const messagesUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/messages/${options.roomId}`;

  // Truncate message preview
  const preview = options.messagePreview.length > 100
    ? options.messagePreview.substring(0, 100) + '...'
    : options.messagePreview;

  // Create in-app notification
  const inAppResult = await createInAppNotification({
    userId: recipientId,
    type: 'message_received',
    title: options.isGroupChat
      ? `New message in ${options.roomName || 'group chat'}`
      : `New message from ${options.senderName}`,
    message: preview,
    linkUrl: `/messages/${options.roomId}`,
    metadata: {
      sender_id: options.senderId,
      room_id: options.roomId,
      is_group_chat: options.isGroupChat,
    },
  });

  // Send email notification
  const emailResult = await sendNotification({
    userId: recipientId,
    type: 'message_received',
    subject: options.isGroupChat
      ? `New message in ${options.roomName || 'group chat'}`
      : `New message from ${options.senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066CC;">New Message</h2>
        <p>Hi ${recipient?.name || 'there'},</p>
        <p><strong>${options.senderName}</strong> sent you a message${options.isGroupChat ? ` in <strong>${options.roomName || 'a group chat'}</strong>` : ''}:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #333;">${preview}</p>
        </div>
        <p>
          <a href="${messagesUrl}" style="display: inline-block; background-color: #0066CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Message
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          You can manage your notification preferences in your account settings.
        </p>
      </div>
    `,
    templateVariables: {
      recipient_name: recipient?.name || 'User',
      sender_name: options.senderName,
      message_preview: preview,
      room_name: options.roomName || '',
      messages_url: messagesUrl,
    },
    metadata: {
      sender_id: options.senderId,
      room_id: options.roomId,
      is_group_chat: options.isGroupChat,
    },
  });

  return {
    email: emailResult,
    inApp: inAppResult,
  };
}

/**
 * Send message notifications to all room members (except sender)
 */
export async function notifyRoomMembers(
  roomId: string,
  senderId: string,
  senderName: string,
  messageContent: string,
  roomName?: string,
  isGroupChat: boolean = false
): Promise<void> {
  try {
    const serviceSupabase = createServiceSupabaseClient();

    // Get all room members except sender
    const { data: members } = await serviceSupabase
      .from('student_chat_members')
      .select('user_id')
      .eq('room_id', roomId)
      .neq('user_id', senderId);

    if (!members || members.length === 0) return;

    // Send notifications to each member (in parallel)
    await Promise.all(
      members.map((member) =>
        notifyNewMessage(member.user_id, {
          senderName,
          senderId,
          messagePreview: messageContent,
          roomId,
          roomName,
          isGroupChat,
        })
      )
    );
  } catch (error) {
    console.error('Error notifying room members:', error);
  }
}
