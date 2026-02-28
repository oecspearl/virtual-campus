import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from '@/lib/database-helpers';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/admin/certificates/templates/[id]
 * Get a single certificate template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view templates
    if (!hasRole(user.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: template, error } = await tq
      .from('certificate_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });

  } catch (error: any) {
    console.error('Get template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/certificates/templates/[id]
 * Update a certificate template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update templates
    if (!hasRole(user.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, template_html, background_image_url, logo_url, is_default } = body;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // If this is set as default, unset other defaults
    if (is_default) {
      await tq
        .from('certificate_templates')
        .update({ is_default: false })
        .eq('is_default', true)
        .neq('id', id);
    }

    // Extract variables from template HTML
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = (template_html || '').match(variableRegex) || [];
    const variables = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (template_html !== undefined) updateData.template_html = template_html;
    if (background_image_url !== undefined) updateData.background_image_url = background_image_url;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (template_html !== undefined) updateData.variables = variables;

    const { data: template, error } = await tq
      .from('certificate_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Template updated successfully',
      template
    });

  } catch (error: any) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/certificates/templates/[id]
 * Delete a certificate template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete templates
    if (!hasRole(user.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if template is default
    const { data: template } = await tq
      .from('certificate_templates')
      .select('is_default')
      .eq('id', id)
      .single();

    if (template?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default template' },
        { status: 400 }
      );
    }

    const { error } = await tq
      .from('certificate_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Template deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}

