import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

// GET - List/search library resources
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search');
    const categoryId = searchParams.get('category_id');
    const resourceType = searchParams.get('resource_type');
    const tags = searchParams.get('tags');
    const isActive = searchParams.get('is_active');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    const offset = (page - 1) * limit;

    let query = tq
      .from('library_resources')
      .select('*, library_resource_categories(id, name, icon, color)', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query = query.overlaps('tags', tagArray);
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Get usage counts for each resource
    const resourceIds = (data || []).map((r: any) => r.id);
    let usageCounts: Record<string, number> = {};

    if (resourceIds.length > 0) {
      const { data: usageData } = await tq
        .from('course_library_resources')
        .select('resource_id');

      if (usageData) {
        for (const u of usageData) {
          if (resourceIds.includes(u.resource_id)) {
            usageCounts[u.resource_id] = (usageCounts[u.resource_id] || 0) + 1;
          }
        }
      }
    }

    const resources = (data || []).map((r: any) => ({
      ...r,
      usage_count: usageCounts[r.id] || 0,
    }));

    return NextResponse.json({
      resources,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    console.error('Error fetching library resources:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch library resources' },
      { status: 500 }
    );
  }
}

// POST - Create a new library resource
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!['admin', 'super_admin', 'tenant_admin', 'instructor', 'curriculum_designer'].includes(authResult.userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, resource_type, url, file_url, file_name, file_size, file_type, category_id, tags, metadata } = body;

    if (!title || !resource_type) {
      return NextResponse.json({ error: 'title and resource_type are required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const insertData: any = {
      title,
      description: description || null,
      resource_type,
      url: url || null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_size: file_size || null,
      file_type: file_type || null,
      category_id: category_id || null,
      tags: tags || [],
      metadata: metadata || {},
      version: 1,
      created_by: authResult.user.id,
      updated_by: authResult.user.id,
    };

    const { data: resource, error } = await tq
      .from('library_resources')
      .insert(insertData)
      .select('*, library_resource_categories(id, name, icon, color)')
      .single();

    if (error) throw error;

    // Create initial version record
    await tq.from('library_resource_versions').insert({
      resource_id: resource.id,
      version: 1,
      url: url || null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_size: file_size || null,
      file_type: file_type || null,
      version_notes: 'Initial version',
      created_by: authResult.user.id,
    });

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating library resource:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create library resource' },
      { status: 500 }
    );
  }
}
