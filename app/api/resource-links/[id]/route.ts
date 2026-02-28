import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';

// PUT - Update a resource link
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has permission
    if (!['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = await params;

    const { title, url, description, link_type } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: 'title and url are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Update the resource link
    const { data: link, error } = await supabase
      .from('resource_links')
      .update({
        title,
        url,
        description: description || null,
        link_type: link_type || 'external',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!link) {
      return NextResponse.json(
        { error: 'Resource link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ link });
  } catch (error: any) {
    console.error('Error updating resource link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update resource link' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a resource link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has permission
    if (!['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const supabase = await createServerSupabaseClient();

    // Delete the resource link
    const { error } = await supabase
      .from('resource_links')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting resource link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete resource link' },
      { status: 500 }
    );
  }
}

