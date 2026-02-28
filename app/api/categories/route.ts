import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

/**
 * GET /api/categories
 * Get all course categories (with optional hierarchy)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const flat = searchParams.get('flat') === 'true';
    const withCounts = searchParams.get('withCounts') === 'true';

    const serviceSupabase = createServiceSupabaseClient();

    let query = serviceSupabase
      .from('course_categories')
      .select('*')
      .order('order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    // Get course counts if requested
    const courseCounts: Record<string, number> = {};
    if (withCounts) {
      const { data: assignments } = await serviceSupabase
        .from('course_category_assignments')
        .select('category_id');

      if (assignments) {
        assignments.forEach(a => {
          courseCounts[a.category_id] = (courseCounts[a.category_id] || 0) + 1;
        });
      }
    }

    // Add counts to categories
    const categoriesWithCounts = categories?.map(cat => ({
      ...cat,
      course_count: courseCounts[cat.id] || 0
    })) || [];

    // Return flat list or hierarchical structure
    if (flat) {
      return NextResponse.json({ categories: categoriesWithCounts });
    }

    // Build hierarchy
    const categoryMap = new Map(categoriesWithCounts.map(c => [c.id, { ...c, children: [] }]));
    const rootCategories: any[] = [];

    categoriesWithCounts.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id)!.children.push(category);
      } else {
        rootCategories.push(category);
      }
    });

    return NextResponse.json({ categories: rootCategories });
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/categories
 * Create a new category (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, icon, color, parent_id, order } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const serviceSupabase = createServiceSupabaseClient();

    // Check for duplicate slug
    const { data: existing } = await serviceSupabase
      .from('course_categories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
    }

    const { data: category, error } = await serviceSupabase
      .from('course_categories')
      .insert([{
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon || 'material-symbols:folder',
        color: color || '#3B82F6',
        parent_id: parent_id || null,
        order: order || 0,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Categories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
