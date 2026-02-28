import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/categories/[id]
 * Get a single category with its courses
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeCourses = searchParams.get('includeCourses') === 'true';

    const serviceSupabase = createServiceSupabaseClient();

    const { data: category, error } = await serviceSupabase
      .from('course_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Get parent category if exists
    let parent = null;
    if (category.parent_id) {
      const { data: parentData } = await serviceSupabase
        .from('course_categories')
        .select('id, name, slug')
        .eq('id', category.parent_id)
        .single();
      parent = parentData;
    }

    // Get child categories
    const { data: children } = await serviceSupabase
      .from('course_categories')
      .select('id, name, slug, icon, color, order')
      .eq('parent_id', id)
      .eq('is_active', true)
      .order('order', { ascending: true });

    // Get courses if requested
    let courses: any[] = [];
    if (includeCourses) {
      const { data: assignments } = await serviceSupabase
        .from('course_category_assignments')
        .select(`
          course_id,
          is_primary,
          courses:course_id (
            id,
            title,
            description,
            thumbnail,
            difficulty,
            published
          )
        `)
        .eq('category_id', id);

      courses = assignments?.map(a => ({
        ...(a.courses as any),
        is_primary: a.is_primary
      })).filter((c: any) => c.id) || [];
    }

    // Get course count
    const { count } = await serviceSupabase
      .from('course_category_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    return NextResponse.json({
      category: {
        ...category,
        parent,
        children: children || [],
        course_count: count || 0,
        courses: includeCourses ? courses : undefined
      }
    });
  } catch (error) {
    console.error('Category GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/categories/[id]
 * Update a category (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, icon, color, parent_id, order, is_active } = body;

    const serviceSupabase = createServiceSupabaseClient();

    // Check if category exists
    const { data: existing } = await serviceSupabase
      .from('course_categories')
      .select('id, slug')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      updateData.name = name.trim();
      // Update slug if name changed
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check for duplicate slug (excluding current)
      const { data: duplicateSlug } = await serviceSupabase
        .from('course_categories')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', id)
        .single();

      if (duplicateSlug) {
        return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
      }
    }

    if (description !== undefined) updateData.description = description?.trim() || null;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.order = order;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Prevent setting parent to self or descendants
    if (parent_id !== undefined) {
      if (parent_id === id) {
        return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 });
      }
      updateData.parent_id = parent_id || null;
    }

    const { data: category, error } = await serviceSupabase
      .from('course_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Category PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete a category (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Check if category has children
    const { count: childCount } = await serviceSupabase
      .from('course_categories')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id);

    if (childCount && childCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete category with subcategories. Delete or reassign subcategories first.'
      }, { status: 400 });
    }

    // Delete the category (assignments will cascade)
    const { error } = await serviceSupabase
      .from('course_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
