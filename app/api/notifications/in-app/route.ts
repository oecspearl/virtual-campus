import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { withTenantAuth } from '@/lib/with-tenant-auth';

/**
 * GET /api/notifications/in-app
 * Get current user's in-app notifications
 */
export const GET = withTenantAuth(async ({ user, request }) => {
  const serviceSupabase = createServiceSupabaseClient();
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const unreadOnly = url.searchParams.get('unread_only') === 'true';

  let query = serviceSupabase
    .from('in_app_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data: notifications, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }

  // Get unread count
  const { count: unreadCount } = await serviceSupabase
    .from('in_app_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return NextResponse.json({
    notifications: notifications || [],
    unread_count: unreadCount || 0
  });
});
