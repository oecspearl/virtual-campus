import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { withTenantAuth } from '@/lib/with-tenant-auth';

/**
 * PUT /api/notifications/in-app/mark-all-read
 * Mark all notifications as read for current user
 */
export const PUT = withTenantAuth(async ({ user }) => {
  const serviceSupabase = createServiceSupabaseClient();

  const { error } = await serviceSupabase
    .from('in_app_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});
