/**
 * Global Announcements API
 * Create and manage system-wide announcements
 */

import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { createGlobalAnnouncement, getActiveAnnouncementsForUser } from '@/lib/announcements/global';

export const GET = withTenantAuth(async ({ user }) => {
  try {
    const announcements = await getActiveAnnouncementsForUser(user.id, user.role);
    return NextResponse.json(announcements);
  } catch (error: any) {
    console.error('Get announcements error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = withTenantAuth(
  async ({ request }) => {
    try {
      const body = await request.json();
      const {
        title,
        message,
        announcement_type,
        target_roles,
        target_tenants,
        target_courses,
        target_users,
        priority,
        is_dismissible,
        show_on_login,
        show_in_dashboard,
        start_date,
        end_date,
        send_notification,
        notification_channels,
      } = body;

      if (!title || !message) {
        return NextResponse.json(
          { error: 'title and message are required' },
          { status: 400 }
        );
      }

      const announcementId = await createGlobalAnnouncement({
        title,
        message,
        announcement_type: announcement_type || 'info',
        target_roles: target_roles || [],
        target_tenants: target_tenants || [],
        target_courses: target_courses || [],
        target_users: target_users || [],
        priority: priority || 'normal',
        is_dismissible: is_dismissible !== false,
        show_on_login: show_on_login || false,
        show_in_dashboard: show_in_dashboard !== false,
        start_date: start_date || null,
        end_date: end_date || null,
        is_active: true,
        send_notification: send_notification || false,
        notification_channels: notification_channels || ['in_app'],
      });

      return NextResponse.json({ success: true, announcement_id: announcementId }, { status: 201 });
    } catch (error: any) {
      console.error('Create announcement error:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { requiredRoles: ['admin', 'super_admin'] }
);
