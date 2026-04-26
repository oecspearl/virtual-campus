import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { sanitizeHtml } from '@/lib/sanitize';

// PUT - Update a resource link
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Verify user has permission
    if (!['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = await params;

    const { title, url, description, link_type, body_html } = body;

    const resolvedType = link_type || 'external';
    const isText = resolvedType === 'text';

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (isText && !body_html) {
      return NextResponse.json(
        { error: 'body_html is required for text resources' },
        { status: 400 }
      );
    }
    if (!isText && !url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Same shape contract as the POST handler — keep in sync.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      title,
      description: description || null,
      link_type: resolvedType,
      updated_at: new Date().toISOString(),
    };
    if (isText) {
      updateData.body_html = sanitizeHtml(body_html);
      updateData.url = null;
    } else {
      updateData.url = url;
      updateData.body_html = null;
    }

    const { data: link, error } = await supabase
      .from('resource_links')
      .update(updateData)
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
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

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

