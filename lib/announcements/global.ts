/**
 * Global Announcements System
 * Manages system-wide announcements and alerts
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface GlobalAnnouncement {
  id: string;
  title: string;
  message: string;
  announcement_type: 'info' | 'warning' | 'error' | 'success' | 'maintenance';
  target_roles?: string[];
  target_tenants?: string[];
  target_courses?: string[];
  target_users?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_dismissible: boolean;
  show_on_login: boolean;
  show_in_dashboard: boolean;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  send_notification: boolean;
  notification_channels: string[];
}

/**
 * Create global announcement
 */
export async function createGlobalAnnouncement(
  announcement: Omit<GlobalAnnouncement, 'id'>
): Promise<string> {
  const supabase = createServiceSupabaseClient();
  
  const { data, error } = await supabase
    .from('global_announcements')
    .insert({
      ...announcement,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error || !data) {
    throw new Error('Failed to create announcement');
  }
  
  // Send notifications if requested
  if (announcement.send_notification) {
    await sendAnnouncementNotifications(data.id, announcement);
  }
  
  return data.id;
}

/**
 * Get active announcements for user
 */
export async function getActiveAnnouncementsForUser(
  userId: string,
  userRole: string
): Promise<GlobalAnnouncement[]> {
  const supabase = createServiceSupabaseClient();
  
  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (!user) {
    return [];
  }
  
  // Query active announcements
  const query = supabase
    .from('global_announcements')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', new Date().toISOString())
    .or('end_date.is.null,end_date.gte.' + new Date().toISOString());
  
  const { data: announcements } = await query;
  
  if (!announcements) {
    return [];
  }
  
  // Filter by targeting
  const filtered = announcements.filter(announcement => {
    // Check role targeting
    if (announcement.target_roles && announcement.target_roles.length > 0) {
      if (!announcement.target_roles.includes(userRole)) {
        return false;
      }
    }
    
    // Check user targeting
    if (announcement.target_users && announcement.target_users.length > 0) {
      if (!announcement.target_users.includes(userId)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Check which announcements user has already seen
  const { data: views } = await supabase
    .from('announcement_views')
    .select('announcement_id, dismissed_at')
    .eq('user_id', userId)
    .in('announcement_id', filtered.map(a => a.id));
  
  const dismissedIds = new Set(
    views?.filter(v => v.dismissed_at).map(v => v.announcement_id) || []
  );
  
  // Return non-dismissed announcements
  return filtered
    .filter(a => !dismissedIds.has(a.id))
    .map(a => ({
      id: a.id,
      title: a.title,
      message: a.message,
      announcement_type: a.announcement_type,
      target_roles: a.target_roles || [],
      target_tenants: a.target_tenants || [],
      target_courses: a.target_courses || [],
      target_users: a.target_users || [],
      priority: a.priority,
      is_dismissible: a.is_dismissible,
      show_on_login: a.show_on_login,
      show_in_dashboard: a.show_in_dashboard,
      start_date: a.start_date,
      end_date: a.end_date,
      is_active: a.is_active,
      send_notification: a.send_notification,
      notification_channels: a.notification_channels || [],
    }));
}

/**
 * Mark announcement as viewed
 */
export async function markAnnouncementViewed(
  announcementId: string,
  userId: string
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  
  await supabase.from('announcement_views').upsert({
    announcement_id: announcementId,
    user_id: userId,
    viewed_at: new Date().toISOString(),
  }, {
    onConflict: 'announcement_id,user_id',
  });
}

/**
 * Dismiss announcement
 */
export async function dismissAnnouncement(
  announcementId: string,
  userId: string
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  
  await supabase.from('announcement_views').upsert({
    announcement_id: announcementId,
    user_id: userId,
    viewed_at: new Date().toISOString(),
    dismissed_at: new Date().toISOString(),
  }, {
    onConflict: 'announcement_id,user_id',
  });
}

/**
 * Send announcement notifications
 */
async function sendAnnouncementNotifications(
  announcementId: string,
  announcement: Omit<GlobalAnnouncement, 'id'>
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { sendOmnichannelNotification } = await import('@/lib/notifications/omnichannel');
  
  // Get target users
  let userIds: string[] = [];
  
  if (announcement.target_users && announcement.target_users.length > 0) {
    userIds = announcement.target_users;
  } else {
    // Get users by role
    let query = supabase.from('users').select('id');
    
    if (announcement.target_roles && announcement.target_roles.length > 0) {
      query = query.in('role', announcement.target_roles);
    }
    
    const { data: users } = await query;
    userIds = users?.map(u => u.id) || [];
  }
  
  // Send to all target users
  for (const userId of userIds) {
    try {
      await sendOmnichannelNotification({
        userId,
        type: 'global_announcement',
        title: announcement.title,
        message: announcement.message,
        channels: {
          email: announcement.notification_channels.includes('email'),
          sms: announcement.notification_channels.includes('sms'),
          whatsapp: announcement.notification_channels.includes('whatsapp'),
          push: announcement.notification_channels.includes('push'),
          in_app: true,
        },
        priority: announcement.priority,
        metadata: {
          announcement_id: announcementId,
          announcement_type: announcement.announcement_type,
        },
      });
    } catch (error) {
      console.error(`Failed to send announcement to user ${userId}:`, error);
    }
  }
}

