import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database-helpers';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * PUT /api/notifications/in-app/mark-all-read
 * Mark all notifications as read for current user
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

  } catch (error: any) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

