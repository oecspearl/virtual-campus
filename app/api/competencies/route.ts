import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/competencies
 * Get all competencies with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeChildren = searchParams.get('include_children') === 'true';
    const courseId = searchParams.get('course_id');

    const serviceSupabase = await createServiceSupabaseClient();

    let query = serviceSupabase
      .from('competencies')
      .select(`
        id,
        name,
        description,
        category,
        parent_id,
        level,
        created_at
      `)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    // Filter by category
    if (category) {
      query = query.eq('category', category);
    }

    // Only get top-level competencies if not including children
    if (!includeChildren) {
      query = query.is('parent_id', null);
    }

    const { data: competencies, error } = await query;

    if (error) {
      console.error('Error fetching competencies:', error);
      return NextResponse.json({ error: 'Failed to fetch competencies' }, { status: 500 });
    }

    // If a course is specified, include which competencies are mapped to it
    if (courseId) {
      const { data: courseCompetencies } = await serviceSupabase
        .from('course_competencies')
        .select('competency_id, proficiency_level, is_primary')
        .eq('course_id', courseId);

      const courseCompMap = new Map(
        courseCompetencies?.map(cc => [cc.competency_id, cc]) || []
      );

      const competenciesWithMapping = competencies?.map(c => ({
        ...c,
        course_mapping: courseCompMap.get(c.id) || null,
      }));

      return NextResponse.json({ competencies: competenciesWithMapping });
    }

    return NextResponse.json({ competencies: competencies || [] });
  } catch (error) {
    console.error('Error in competencies GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/competencies
 * Create a new competency
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const serviceSupabase = await createServiceSupabaseClient();
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create competencies' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, parent_id, level } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // If parent_id is provided, validate it exists and set level
    let competencyLevel = level || 1;
    if (parent_id) {
      const { data: parent } = await serviceSupabase
        .from('competencies')
        .select('id, level')
        .eq('id', parent_id)
        .single();

      if (!parent) {
        return NextResponse.json({ error: 'Parent competency not found' }, { status: 400 });
      }

      competencyLevel = parent.level + 1;
    }

    const { data: competency, error } = await serviceSupabase
      .from('competencies')
      .insert({
        name,
        description,
        category,
        parent_id: parent_id || null,
        level: competencyLevel,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating competency:', error);
      return NextResponse.json({ error: 'Failed to create competency' }, { status: 500 });
    }

    return NextResponse.json({ competency }, { status: 201 });
  } catch (error) {
    console.error('Error in competencies POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
