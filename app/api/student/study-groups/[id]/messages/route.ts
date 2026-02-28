import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/student/study-groups/[id]/messages
 * Get messages for a study group
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // For pagination

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify membership
    const { data: membership } = await tq
      .from('study_group_members')
      .select('id')
      .eq('group_id', id)
      .eq('student_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    let query = tq
      .from('study_group_messages')
      .select(`
        id,
        sender_id,
        content,
        message_type,
        attachment_url,
        attachment_name,
        reply_to_id,
        is_pinned,
        edited_at,
        created_at
      `)
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Enrich messages with sender info (name is on users table, avatar on user_profiles)
    const enrichedMessages = await Promise.all(
      (messages || []).map(async (msg) => {
        const { data: userData } = await tq
          .from('users')
          .select('id, name')
          .eq('id', msg.sender_id)
          .single();

        const { data: profileData } = await tq
          .from('user_profiles')
          .select('avatar')
          .eq('id', msg.sender_id)
          .single();

        return {
          ...msg,
          sender: userData ? {
            ...userData,
            avatar_url: profileData?.avatar || null
          } : null,
        };
      })
    );

    // Update last active time
    await tq
      .from('study_group_members')
      .update({ last_active_at: new Date().toISOString() })
      .eq('group_id', id)
      .eq('student_id', user.id);

    // Reverse to get chronological order
    const sortedMessages = enrichedMessages.reverse();

    return NextResponse.json({
      messages: sortedMessages,
      has_more: messages?.length === limit,
    });
  } catch (error) {
    console.error('Error in study-group messages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/student/study-groups/[id]/messages
 * Send a message to a study group
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, message_type, attachment_url, attachment_name, reply_to_id } = body;

    if (!content && !attachment_url) {
      return NextResponse.json({
        error: 'Content or attachment is required'
      }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify membership
    const { data: membership } = await tq
      .from('study_group_members')
      .select('id')
      .eq('group_id', id)
      .eq('student_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    const { data: message, error } = await tq
      .from('study_group_messages')
      .insert({
        group_id: id,
        sender_id: user.id,
        content: content || '',
        message_type: message_type || 'text',
        attachment_url: attachment_url || null,
        attachment_name: attachment_name || null,
        reply_to_id: reply_to_id || null,
      })
      .select(`
        id,
        sender_id,
        content,
        message_type,
        attachment_url,
        attachment_name,
        reply_to_id,
        is_pinned,
        created_at
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Get sender info (name is on users table, avatar on user_profiles)
    const { data: userData } = await tq
      .from('users')
      .select('id, name')
      .eq('id', user.id)
      .single();

    const { data: profileData } = await tq
      .from('user_profiles')
      .select('avatar')
      .eq('id', user.id)
      .single();

    const enrichedMessage = {
      ...message,
      sender: userData ? {
        ...userData,
        avatar_url: profileData?.avatar || null
      } : null,
    };

    // Update group's updated_at
    await tq
      .from('study_groups')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    // Update sender's last active time
    await tq
      .from('study_group_members')
      .update({ last_active_at: new Date().toISOString() })
      .eq('group_id', id)
      .eq('student_id', user.id);

    return NextResponse.json({ message: enrichedMessage }, { status: 201 });
  } catch (error) {
    console.error('Error in study-group messages POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
