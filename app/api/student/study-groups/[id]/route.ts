import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/student/study-groups/[id]
 * Get a single study group with details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is a member
    const { data: membership } = await tq
      .from('study_group_members')
      .select('role')
      .eq('group_id', id)
      .eq('student_id', user.id)
      .single();

    // Get group data without nested user relations (users table has 'name', not 'full_name')
    const { data: group, error } = await tq
      .from('study_groups')
      .select(`
        *,
        course:courses(id, title),
        members:study_group_members(
          id,
          student_id,
          role,
          joined_at,
          last_active_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
      console.error('Error fetching group:', error);
      return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }

    // Check access for private groups
    if (group.is_private && !membership) {
      return NextResponse.json({
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          is_private: true,
          member_count: group.members?.length || 0,
        },
        is_member: false,
        my_role: null,
      });
    }

    // Get creator info (name is on users table, avatar on user_profiles)
    let creator = null;
    if (group.created_by) {
      const { data: creatorData } = await tq
        .from('users')
        .select('id, name')
        .eq('id', group.created_by)
        .single();

      const { data: creatorProfile } = await tq
        .from('user_profiles')
        .select('avatar')
        .eq('id', group.created_by)
        .single();

      creator = creatorData ? {
        ...creatorData,
        avatar_url: creatorProfile?.avatar || null
      } : null;
    }

    // Enrich members with user info
    const enrichedMembers = await Promise.all(
      (group.members || []).map(async (member: any) => {
        const { data: userData } = await tq
          .from('users')
          .select('id, name')
          .eq('id', member.student_id)
          .single();

        const { data: profileData } = await tq
          .from('user_profiles')
          .select('avatar')
          .eq('id', member.student_id)
          .single();

        return {
          ...member,
          student: userData ? {
            ...userData,
            avatar_url: profileData?.avatar || null
          } : null,
        };
      })
    );

    // Get recent messages count
    const { count: unreadCount } = await tq
      .from('study_group_messages')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', id)
      .gt('created_at', (membership as any)?.last_active_at || new Date(0).toISOString());

    return NextResponse.json({
      group: {
        ...group,
        creator,
        members: enrichedMembers,
        member_count: group.members?.length || 0,
      },
      is_member: !!membership,
      my_role: membership?.role || null,
      unread_messages: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error in study-group GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/student/study-groups/[id]
 * Update a study group
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is owner or admin
    const { data: membership } = await tq
      .from('study_group_members')
      .select('role')
      .eq('group_id', id)
      .eq('student_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, is_private, max_members, settings, avatar_url } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_private !== undefined) updateData.is_private = is_private;
    if (max_members !== undefined) updateData.max_members = max_members;
    if (settings !== undefined) updateData.settings = settings;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data: group, error } = await tq
      .from('study_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating group:', error);
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Error in study-group PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/student/study-groups/[id]
 * Delete a study group (owner only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is owner
    const { data: group } = await tq
      .from('study_groups')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!group || group.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await tq
      .from('study_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting group:', error);
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in study-group DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
