import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database-helpers';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * PUT /api/notifications/in-app/[id]/read
 * Mark a notification as read
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const serviceSupabase = createServiceSupabaseClient();

    // Verify notification belongs to user
    const { data: notification } = await serviceSupabase
      .from('in_app_notifications')
      .select('user_id, is_read')
      .eq('id', id)
      .single();

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Mark as read
    const { error: updateError } = await serviceSupabase
      .from('in_app_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating notification:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

