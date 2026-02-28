import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';

/**
 * POST /api/notifications/push/subscribe
 * Register a push notification token for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, platform = 'web' } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // Get current preferences
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('push_tokens')
      .eq('user_id', user.id)
      .single();

    let pushTokens: Array<{ token: string; platform: string; created_at: string }> = [];

    if (preferences?.push_tokens) {
      pushTokens = Array.isArray(preferences.push_tokens) ? preferences.push_tokens : [];
    }

    // Check if token already exists
    const existingIndex = pushTokens.findIndex((t) => t.token === token);
    if (existingIndex === -1) {
      // Add new token
      pushTokens.push({
        token,
        platform,
        created_at: new Date().toISOString(),
      });
    } else {
      // Update existing token's timestamp
      pushTokens[existingIndex].created_at = new Date().toISOString();
    }

    // Update or create preferences
    if (preferences) {
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          push_tokens: pushTokens,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating push tokens:', error);
        return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from('notification_preferences').insert({
        user_id: user.id,
        push_enabled: true,
        push_tokens: pushTokens,
        email_enabled: true,
        in_app_enabled: true,
      });

      if (error) {
        console.error('Error creating notification preferences:', error);
        return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Push notification token registered',
    });
  } catch (error: any) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/push/subscribe
 * Unregister a push notification token
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // Get current preferences
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('push_tokens')
      .eq('user_id', user.id)
      .single();

    if (!preferences) {
      return NextResponse.json({ success: true, message: 'No tokens registered' });
    }

    let pushTokens: Array<{ token: string; platform: string; created_at: string }> = [];
    if (preferences.push_tokens) {
      pushTokens = Array.isArray(preferences.push_tokens) ? preferences.push_tokens : [];
    }

    // Remove the token
    pushTokens = pushTokens.filter((t) => t.token !== token);

    // Update preferences
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        push_tokens: pushTokens,
        push_enabled: pushTokens.length > 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing push token:', error);
      return NextResponse.json({ error: 'Failed to remove token' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Push notification token removed',
    });
  } catch (error: any) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
