import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/student/study-groups
 * Get all study groups for the current student
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const includePublic = searchParams.get('include_public') === 'true';

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get groups user is a member of
    const { data: memberships } = await tq
      .from('study_group_members')
      .select('group_id, role')
      .eq('student_id', user.id);

    const memberGroupIds = memberships?.map(m => m.group_id) || [];

    let query = tq
      .from('study_groups')
      .select(`
        *,
        course:courses(id, title),
        members:study_group_members(count)
      `)
      .order('updated_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (includePublic) {
      // Get both member groups and public groups
      if (memberGroupIds.length > 0) {
        // Use proper Supabase filter syntax to avoid SQL injection
        query = query.or(`id.in.(${memberGroupIds.map(id => `"${id}"`).join(',')}),is_private.eq.false`);
      } else {
        query = query.eq('is_private', false);
      }
    } else {
      // Only get groups user is a member of
      if (memberGroupIds.length === 0) {
        return NextResponse.json({ groups: [], memberships: [] });
      }
      query = query.in('id', memberGroupIds);
    }

    const { data: groups, error } = await query;

    if (error) {
      console.error('Error fetching study groups:', error);
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    // Enrich groups with creator info and member count
    const groupsWithInfo = await Promise.all(
      (groups || []).map(async (group) => {
        const membership = memberships?.find(m => m.group_id === group.id);
        const memberArray = group.members as { count: number }[] | null;
        const memberCount = memberArray?.[0]?.count || 0;

        // Get creator info (name is on users table, avatar on user_profiles)
        let creator = null;
        if (group.created_by) {
          const { data: userData } = await tq
            .from('users')
            .select('id, name')
            .eq('id', group.created_by)
            .single();

          // Get avatar from user_profiles if available
          const { data: profileData } = await tq
            .from('user_profiles')
            .select('avatar')
            .eq('id', group.created_by)
            .single();

          creator = userData ? {
            ...userData,
            avatar_url: profileData?.avatar || null
          } : null;
        }

        return {
          ...group,
          creator,
          is_member: !!membership,
          my_role: membership?.role || null,
          member_count: memberCount,
        };
      })
    );

    return NextResponse.json({
      groups: groupsWithInfo,
    });
  } catch (error) {
    console.error('Error in study-groups GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/student/study-groups
 * Create a new study group
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, course_id, is_private, max_members } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: group, error } = await tq
      .from('study_groups')
      .insert({
        name,
        description: description || null,
        course_id: course_id || null,
        created_by: user.id,
        is_private: is_private !== false,
        max_members: max_members || 10,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating study group:', error);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('Error in study-groups POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
