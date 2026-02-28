/**
 * Omnichannel Notifications API
 * Send notifications via multiple channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOmnichannelNotification } from '@/lib/notifications/omnichannel';
import { authenticateUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only instructors and admins can send notifications
    if (authResult.userProfile.role !== 'instructor' && 
        authResult.userProfile.role !== 'admin' && 
        authResult.userProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      user_id,
      type,
      title,
      message,
      link_url,
      channels,
      priority,
      scheduled_for,
      metadata,
    } = body;

    if (!user_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'user_id, type, title, and message are required' },
        { status: 400 }
      );
    }

    if (!channels || Object.keys(channels).length === 0) {
      return NextResponse.json(
        { error: 'At least one channel must be specified' },
        { status: 400 }
      );
    }

    const result = await sendOmnichannelNotification({
      userId: user_id,
      type,
      title,
      message,
      linkUrl: link_url,
      channels,
      priority,
      scheduledFor: scheduled_for ? new Date(scheduled_for) : undefined,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send notification', errors: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification_id: result.notificationId,
    });
  } catch (error: any) {
    console.error('Omnichannel notification error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

