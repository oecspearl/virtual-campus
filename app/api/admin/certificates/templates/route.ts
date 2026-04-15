import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/admin/certificates/templates
 * Get all certificate templates
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Only admins can view templates
    if (!hasRole(user.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse("Forbidden", 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: templates, error } = await tq
      .from('certificate_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });

  } catch (error: any) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/certificates/templates
 * Create a new certificate template
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Only admins can create templates
    if (!hasRole(user.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse("Forbidden", 403);
    }

    const body = await request.json();
    const { name, description, template_html, background_image_url, logo_url, is_default } = body;

    if (!name || !template_html) {
      return NextResponse.json(
        { error: 'name and template_html are required' },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // If this is set as default, unset other defaults
    if (is_default) {
      await tq
        .from('certificate_templates')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    // Extract variables from template HTML
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = template_html.match(variableRegex) || [];
    const variables = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];

    const { data: template, error } = await tq
      .from('certificate_templates')
      .insert([{
        name,
        description: description || null,
        template_html,
        background_image_url: background_image_url || null,
        logo_url: logo_url || null,
        is_default: is_default || false,
        variables: variables,
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Template created successfully',
      template
    });

  } catch (error: any) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}

