import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * POST /api/student/study-groups/join
 * Join a study group via join code or direct join for public groups
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { group_id, join_code } = body;

    if (!group_id && !join_code) {
      return NextResponse.json({
        error: 'Either group_id or join_code is required'
      }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Find the group
    let group;
    if (join_code) {
      const { data, error } = await tq
        .from('study_groups')
        .select('id, name, is_private, max_members')
        .eq('join_code', join_code.toUpperCase())
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Invalid join code' }, { status: 404 });
      }
      group = data;
    } else {
      const { data, error } = await tq
        .from('study_groups')
        .select('id, name, is_private, max_members')
        .eq('id', group_id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
      group = data;

      // For direct join without code, group must be public
      if (data.is_private) {
        return NextResponse.json({
          error: 'This is a private group. Use a join code to join.'
        }, { status: 403 });
      }
    }

    // Check if already a member
    const { data: existingMembership } = await tq
      .from('study_group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('student_id', user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member of this group' }, { status: 409 });
    }

    // Check member count
    const { count: memberCount } = await tq
      .from('study_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group.id);

    if (memberCount && memberCount >= group.max_members) {
      return NextResponse.json({ error: 'Group is full' }, { status: 400 });
    }

    // Join the group
    const { data: membership, error: joinError } = await tq
      .from('study_group_members')
      .insert({
        group_id: group.id,
        student_id: user.id,
        role: 'member',
      })
      .select()
      .single();

    if (joinError) {
      console.error('Error joining group:', joinError);
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }

    // Add system message
    await tq
      .from('study_group_messages')
      .insert({
        group_id: group.id,
        sender_id: user.id,
        content: 'joined the group',
        message_type: 'system',
      });

    return NextResponse.json({
      membership,
      group: {
        id: group.id,
        name: group.name,
      },
    });
  } catch (error) {
    console.error('Error in study-groups join POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/student/study-groups/join
 * Leave a study group
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check membership
    const { data: membership } = await tq
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('student_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 404 });
    }

    // Owners can't leave - they must delete the group or transfer ownership
    if (membership.role === 'owner') {
      return NextResponse.json({
        error: 'Owners cannot leave. Transfer ownership or delete the group.'
      }, { status: 400 });
    }

    // Remove membership
    const { error } = await tq
      .from('study_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('student_id', user.id);

    if (error) {
      console.error('Error leaving group:', error);
      return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 });
    }

    // Add system message
    await tq
      .from('study_group_messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content: 'left the group',
        message_type: 'system',
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in study-groups leave DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
