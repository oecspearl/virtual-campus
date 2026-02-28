/**
 * Omnichannel Notification Service
 * Sends notifications via multiple channels (Email, SMS, WhatsApp, Push)
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface NotificationChannel {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  push?: boolean;
  in_app?: boolean;
}

export interface OmnichannelNotificationOptions {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  channels: NotificationChannel;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

/**
 * Send omnichannel notification
 */
export async function sendOmnichannelNotification(
  options: OmnichannelNotificationOptions
): Promise<{ success: boolean; notificationId?: string; errors?: Record<string, string> }> {
  const supabase = createServiceSupabaseClient();
  
  // Get user preferences
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', options.userId)
    .single();
  
  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('email, name, phone_number')
    .eq('id', options.userId)
    .single();
  
  if (!user) {
    return { success: false, errors: { general: 'User not found' } };
  }
  
  // Create omnichannel notification record
  const channels: any[] = [];
  const errors: Record<string, string> = {};
  
  // Email
  if (options.channels.email && preferences?.email_enabled !== false) {
    try {
      const notificationsModule = await import('@/lib/notifications');
      const sendNotification = notificationsModule.sendNotification;
      await sendNotification({
        userId: options.userId,
        type: options.type as any,
        subject: options.title,
        html: options.message,
        templateVariables: options.metadata,
      });
      channels.push({ channel: 'email', status: 'sent', sent_at: new Date().toISOString() });
    } catch (error: any) {
      channels.push({ channel: 'email', status: 'failed', error: error.message });
      errors.email = error.message;
    }
  }
  
  // SMS
  if (options.channels.sms && preferences?.sms_enabled && user.phone_number) {
    try {
      await sendSMS(options.userId, user.phone_number, options.message);
      channels.push({ channel: 'sms', status: 'sent', sent_at: new Date().toISOString() });
    } catch (error: any) {
      channels.push({ channel: 'sms', status: 'failed', error: error.message });
      errors.sms = error.message;
    }
  }
  
  // WhatsApp
  if (options.channels.whatsapp && preferences?.whatsapp_enabled && user.phone_number) {
    try {
      await sendWhatsApp(options.userId, user.phone_number, options.message);
      channels.push({ channel: 'whatsapp', status: 'sent', sent_at: new Date().toISOString() });
    } catch (error: any) {
      channels.push({ channel: 'whatsapp', status: 'failed', error: error.message });
      errors.whatsapp = error.message;
    }
  }
  
  // Push
  if (options.channels.push && preferences?.push_enabled) {
    try {
      await sendPushNotification(options.userId, options.title, options.message, options.metadata);
      channels.push({ channel: 'push', status: 'sent', sent_at: new Date().toISOString() });
    } catch (error: any) {
      channels.push({ channel: 'push', status: 'failed', error: error.message });
      errors.push = error.message;
    }
  }
  
  // In-app
  if (options.channels.in_app !== false) {
    try {
      await supabase.from('in_app_notifications').insert({
        user_id: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        link_url: options.linkUrl,
        metadata: options.metadata || {},
      });
      channels.push({ channel: 'in_app', status: 'sent', sent_at: new Date().toISOString() });
    } catch (error: any) {
      channels.push({ channel: 'in_app', status: 'failed', error: error.message });
      errors.in_app = error.message;
    }
  }
  
  // Create omnichannel notification record
  const { data: notification, error } = await supabase
    .from('omnichannel_notifications')
    .insert({
      user_id: options.userId,
      notification_type: options.type,
      title: options.title,
      message: options.message,
      link_url: options.linkUrl,
      channels,
      priority: options.priority || 'normal',
      scheduled_for: options.scheduledFor?.toISOString() || null,
      metadata: options.metadata || {},
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    return { success: false, errors: { general: error.message } };
  }
  
  return {
    success: Object.keys(errors).length === 0,
    notificationId: notification.id,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * Send SMS notification
 */
async function sendSMS(userId: string, phoneNumber: string, message: string): Promise<void> {
  const supabase = createServiceSupabaseClient();

  // Get SMS channel configuration
  const { data: channel } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('channel_type', 'sms')
    .eq('is_active', true)
    .single();

  if (!channel) {
    throw new Error('SMS channel not configured');
  }

  // Create SMS notification record with pending status
  const { data: notification } = await supabase
    .from('sms_notifications')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      message,
      status: 'pending',
    })
    .select()
    .single();

  if (!notification) {
    throw new Error('Failed to create SMS notification record');
  }

  // Send via Twilio SMS
  if (channel.provider === 'twilio') {
    try {
      const twilio = await import('twilio');
      const client = twilio.default(channel.api_key, channel.api_secret);

      const fromNumber = channel.configuration?.from_number;
      if (!fromNumber) {
        throw new Error('Twilio from_number not configured');
      }

      const result = await client.messages.create({
        body: message,
        to: phoneNumber,
        from: fromNumber,
      });

      // Update notification status
      await supabase
        .from('sms_notifications')
        .update({
          status: 'sent',
          provider_message_id: result.sid,
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);
    } catch (error: any) {
      // Update notification with error
      await supabase
        .from('sms_notifications')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', notification.id);

      throw error;
    }
  }
  // Fallback for development/testing (no actual send)
  else {
    await supabase
      .from('sms_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', notification.id);
  }
}

/**
 * Send WhatsApp notification
 */
async function sendWhatsApp(userId: string, phoneNumber: string, message: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  
  // Get WhatsApp channel configuration
  const { data: channel } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('channel_type', 'whatsapp')
    .eq('is_active', true)
    .single();
  
  if (!channel) {
    throw new Error('WhatsApp channel not configured');
  }
  
  // Create WhatsApp notification record
  const { data: notification } = await supabase
    .from('whatsapp_notifications')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      message,
      status: 'pending',
    })
    .select()
    .single();
  
  if (!notification) {
    throw new Error('Failed to create WhatsApp notification record');
  }
  
  // Send via Twilio WhatsApp
  if (channel.provider === 'twilio') {
    try {
      // Dynamic import to avoid build-time errors
      const twilio = await import('twilio');
      const client = twilio.default(channel.api_key, channel.api_secret);
      
      const fromNumber = channel.configuration.from_number || 'whatsapp:+14155238886';
      const toNumber = phoneNumber.startsWith('whatsapp:') 
        ? phoneNumber 
        : `whatsapp:${phoneNumber}`;
      
      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: toNumber,
      });
      
      // Update notification status
      await supabase
        .from('whatsapp_notifications')
        .update({
          status: 'sent',
          provider_message_id: result.sid,
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);
    } catch (error: any) {
      // Update notification with error
      await supabase
        .from('whatsapp_notifications')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', notification.id);
      
      throw error;
    }
  }
  
  // Send via Meta WhatsApp Business API
  else if (channel.provider === 'meta') {
    try {
      const phoneNumberId = channel.configuration.phone_number_id;
      const accessToken = channel.api_key;
      
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber.replace(/^\+/, ''), // Remove + for Meta
            type: 'text',
            text: { body: message },
          }),
        }
      );
      
      const data = await response.json();
      
      if (response.ok && data.messages) {
        await supabase
          .from('whatsapp_notifications')
          .update({
            status: 'sent',
            provider_message_id: data.messages[0].id,
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
      } else {
        const errorMsg = data.error?.message || 'Failed to send WhatsApp message';
        await supabase
          .from('whatsapp_notifications')
          .update({
            status: 'failed',
            error_message: errorMsg,
          })
          .eq('id', notification.id);
        
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      await supabase
        .from('whatsapp_notifications')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', notification.id);
      
      throw error;
    }
  }
  
  // If no provider integration, mark as sent (for testing/development)
  else {
    await supabase
      .from('whatsapp_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', notification.id);
  }
}

/**
 * Send Push notification via Firebase Cloud Messaging
 */
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const supabase = createServiceSupabaseClient();

  // Get user's push tokens
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('push_tokens')
    .eq('user_id', userId)
    .single();

  const tokens: Array<{ token: string; platform: string }> = preferences?.push_tokens || [];

  if (tokens.length === 0) {
    throw new Error('No push tokens registered for user');
  }

  // Import Firebase Admin SDK dynamically to avoid build issues
  const { sendPushNotificationFCM } = await import('@/lib/firebase/admin');

  // Send to each token
  const invalidTokens: string[] = [];
  let successCount = 0;

  for (const tokenInfo of tokens) {
    // Create push notification record
    const { data: notification } = await supabase
      .from('push_notifications')
      .insert({
        user_id: userId,
        device_token: tokenInfo.token,
        platform: tokenInfo.platform,
        title,
        body,
        data: data || {},
        status: 'pending',
      })
      .select()
      .single();

    // Send via FCM
    const result = await sendPushNotificationFCM(
      tokenInfo.token,
      title,
      body,
      data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
      { url: data?.url }
    );

    // Update notification record
    if (notification) {
      await supabase
        .from('push_notifications')
        .update({
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId,
          error_message: result.error,
          sent_at: result.success ? new Date().toISOString() : null,
        })
        .eq('id', notification.id);
    }

    if (result.success) {
      successCount++;
    } else if (result.error?.includes('Invalid') || result.error?.includes('expired')) {
      invalidTokens.push(tokenInfo.token);
    }
  }

  // Clean up invalid tokens
  if (invalidTokens.length > 0) {
    const validTokens = tokens.filter((t) => !invalidTokens.includes(t.token));
    await supabase
      .from('notification_preferences')
      .update({
        push_tokens: validTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  if (successCount === 0) {
    throw new Error('Failed to send push notification to any device');
  }
}

