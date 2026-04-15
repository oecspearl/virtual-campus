import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

/**
 * GET /api/accessibility/captions/[id]
 * Get a specific caption track
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq.from('video_captions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching caption:', error);
      return NextResponse.json({ error: 'Caption not found' }, { status: 404 });
    }

    return NextResponse.json({ caption: data });
  } catch (error) {
    console.error('Error in caption GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/accessibility/captions/[id]
 * Update a caption track (e.g., set as default)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    const body = await request.json();
    const { is_default, label } = body;

    // Get the caption to find its video_url
    const { data: caption, error: fetchError } = await tq.from('video_captions')
      .select('video_url')
      .eq('id', id)
      .single();

    if (fetchError || !caption) {
      return NextResponse.json({ error: 'Caption not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults for this video
    if (is_default) {
      await tq.from('video_captions')
        .update({ is_default: false })
        .eq('video_url', caption.video_url);
    }

    // Update the caption
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof is_default === 'boolean') updateData.is_default = is_default;
    if (label !== undefined) updateData.label = label;

    const { data, error } = await tq.from('video_captions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating caption:', error);
      return NextResponse.json({ error: 'Failed to update caption' }, { status: 500 });
    }

    return NextResponse.json({ caption: data });
  } catch (error) {
    console.error('Error in caption PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/accessibility/captions/[id]
 * Delete a caption track
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    // Check user role
    const { data: userData } = await tq.from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['admin', 'super_admin', 'instructor', 'curriculum_designer'];
    if (!userData || !allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get caption details for cleanup
    const { data: caption } = await tq.from('video_captions')
      .select('caption_url')
      .eq('id', id)
      .single();

    // Delete from storage if URL exists
    if (caption?.caption_url && caption.caption_url.includes('/captions/')) {
      const storagePath = caption.caption_url.split('/captions/')[1];
      if (storagePath) {
        await tq.raw.storage.from('captions').remove([storagePath]);
      }
    }

    // Delete from database
    const { error } = await tq.from('video_captions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting caption:', error);
      return NextResponse.json({ error: 'Failed to delete caption' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in caption DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
