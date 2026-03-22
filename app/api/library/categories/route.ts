import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

// GET - List library resource categories
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { searchParams } = new URL(request.url);
    const withCounts = searchParams.get('withCounts') === 'true';
    const flat = searchParams.get('flat') === 'true';

    let query = tq
      .from('library_resource_categories')
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true });

    const { data: categories, error } = await query;

    if (error) throw error;

    let result = categories || [];

    // Add resource counts if requested
    if (withCounts && result.length > 0) {
      const { data: resources } = await tq
        .from('library_resources')
        .select('category_id')
        .eq('is_active', true);

      const counts: Record<string, number> = {};
      if (resources) {
        for (const r of resources) {
          if (r.category_id) {
            counts[r.category_id] = (counts[r.category_id] || 0) + 1;
          }
        }
      }

      result = result.map((cat: any) => ({
        ...cat,
        resource_count: counts[cat.id] || 0,
      }));
    }

    // Build hierarchy if not flat
    if (!flat) {
      const map = new Map<string, any>();
      const roots: any[] = [];

      for (const cat of result) {
        map.set(cat.id, { ...cat, children: [] });
      }

      for (const cat of result) {
        const node = map.get(cat.id);
        if (cat.parent_id && map.has(cat.parent_id)) {
          map.get(cat.parent_id).children.push(node);
        } else {
          roots.push(node);
        }
      }

      return NextResponse.json({ categories: roots });
    }

    return NextResponse.json({ categories: result });
  } catch (error: any) {
    console.error('Error fetching library categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch library categories' },
      { status: 500 }
    );
  }
}

// POST - Create a new library resource category
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!['admin', 'super_admin', 'tenant_admin'].includes(authResult.userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, icon, color, parent_id, order } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: category, error } = await tq
      .from('library_resource_categories')
      .insert({
        name,
        slug,
        description: description || null,
        icon: icon || 'material-symbols:folder',
        color: color || '#3B82F6',
        parent_id: parent_id || null,
        order: order || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating library category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create library category' },
      { status: 500 }
    );
  }
}
