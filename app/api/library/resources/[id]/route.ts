import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

// GET - Fetch a single library resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: resource, error } = await tq
      .from('library_resources')
      .select('*, library_resource_categories(id, name, icon, color)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Get usage count
    const { data: usageData } = await tq
      .from('course_library_resources')
      .select('id, course_id, lesson_id')
      .eq('resource_id', id);

    return NextResponse.json({
      resource: {
        ...resource,
        usage_count: usageData?.length || 0,
        course_attachments: usageData || [],
      },
    });
  } catch (error: any) {
    console.error('Error fetching library resource:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch library resource' },
      { status: 500 }
    );
  }
}

// PUT - Update a library resource
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!['admin', 'super_admin', 'tenant_admin', 'instructor', 'curriculum_designer'].includes(authResult.userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Fetch current resource
    const { data: current, error: fetchError } = await tq
      .from('library_resources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const fileChanged = (body.file_url && body.file_url !== current.file_url) ||
                        (body.url && body.url !== current.url);

    const updateData: any = {
      updated_by: authResult.user.id,
    };

    // Only include fields that were provided
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.resource_type !== undefined) updateData.resource_type = body.resource_type;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.file_url !== undefined) updateData.file_url = body.file_url;
    if (body.file_name !== undefined) updateData.file_name = body.file_name;
    if (body.file_size !== undefined) updateData.file_size = body.file_size;
    if (body.file_type !== undefined) updateData.file_type = body.file_type;
    if (body.category_id !== undefined) updateData.category_id = body.category_id || null;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // If file/URL changed, bump version
    if (fileChanged) {
      const newVersion = current.version + 1;
      updateData.version = newVersion;
      updateData.version_notes = body.version_notes || `Updated to version ${newVersion}`;

      // Save version history
      await tq.from('library_resource_versions').insert({
        resource_id: id,
        version: newVersion,
        url: body.url || current.url,
        file_url: body.file_url || current.file_url,
        file_name: body.file_name || current.file_name,
        file_size: body.file_size || current.file_size,
        file_type: body.file_type || current.file_type,
        version_notes: body.version_notes || `Updated to version ${newVersion}`,
        created_by: authResult.user.id,
      });
    }

    const { data: resource, error } = await tq
      .from('library_resources')
      .update(updateData)
      .eq('id', id)
      .select('*, library_resource_categories(id, name, icon, color)')
      .single();

    if (error) throw error;

    return NextResponse.json({ resource });
  } catch (error: any) {
    console.error('Error updating library resource:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update library resource' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a library resource
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!['admin', 'super_admin', 'tenant_admin'].includes(authResult.userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    if (permanent) {
      const { error } = await tq
        .from('library_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      const { error } = await tq
        .from('library_resources')
        .update({ is_active: false, updated_by: authResult.user.id })
        .eq('id', id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting library resource:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete library resource' },
      { status: 500 }
    );
  }
}
