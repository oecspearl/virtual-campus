import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/competencies/[id]
 * Get a single competency with its details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const serviceSupabase = await createServiceSupabaseClient();

    const { data: competency, error } = await serviceSupabase
      .from('competencies')
      .select(`
        id,
        name,
        description,
        category,
        parent_id,
        level,
        created_at,
        parent:competencies!competencies_parent_id_fkey(id, name),
        children:competencies!competencies_parent_id_fkey1(id, name, description)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Competency not found' }, { status: 404 });
      }
      console.error('Error fetching competency:', error);
      return NextResponse.json({ error: 'Failed to fetch competency' }, { status: 500 });
    }

    // Get courses that teach this competency
    const { data: courses } = await serviceSupabase
      .from('course_competencies')
      .select(`
        proficiency_level,
        is_primary,
        course:courses(id, title, thumbnail)
      `)
      .eq('competency_id', id);

    // Get lessons that teach this competency
    const { data: lessons } = await serviceSupabase
      .from('lesson_competencies')
      .select(`
        proficiency_level,
        lesson:lessons(id, title, course_id)
      `)
      .eq('competency_id', id);

    return NextResponse.json({
      competency: {
        ...competency,
        courses: courses?.map(c => ({
          ...c.course,
          proficiency_level: c.proficiency_level,
          is_primary: c.is_primary,
        })) || [],
        lessons: lessons?.map(l => ({
          ...l.lesson,
          proficiency_level: l.proficiency_level,
        })) || [],
      },
    });
  } catch (error) {
    console.error('Error in competency GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/competencies/[id]
 * Update a competency
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: 'Only admins can update competencies' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, parent_id } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;

    // Handle parent_id change
    if (parent_id !== undefined) {
      // Check for circular dependency
      if (parent_id === id) {
        return NextResponse.json({ error: 'Competency cannot be its own parent' }, { status: 400 });
      }

      if (parent_id) {
        // Validate parent exists
        const { data: parent } = await serviceSupabase
          .from('competencies')
          .select('id, level')
          .eq('id', parent_id)
          .single();

        if (!parent) {
          return NextResponse.json({ error: 'Parent competency not found' }, { status: 400 });
        }

        updateData.parent_id = parent_id;
        updateData.level = parent.level + 1;
      } else {
        updateData.parent_id = null;
        updateData.level = 1;
      }
    }

    const { data: competency, error } = await serviceSupabase
      .from('competencies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating competency:', error);
      return NextResponse.json({ error: 'Failed to update competency' }, { status: 500 });
    }

    return NextResponse.json({ competency });
  } catch (error) {
    console.error('Error in competency PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/competencies/[id]
 * Delete a competency
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: 'Only admins can delete competencies' }, { status: 403 });
    }

    // Check if competency has children
    const { data: children } = await serviceSupabase
      .from('competencies')
      .select('id')
      .eq('parent_id', id)
      .limit(1);

    if (children && children.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete competency with child competencies. Delete children first.'
      }, { status: 400 });
    }

    const { error } = await serviceSupabase
      .from('competencies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting competency:', error);
      return NextResponse.json({ error: 'Failed to delete competency' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in competency DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
