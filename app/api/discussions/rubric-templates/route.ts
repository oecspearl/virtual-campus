import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/discussions/rubric-templates - Get all rubric templates
export async function GET(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get all templates (system templates + user's own templates)
    const { data: templates, error } = await tq
      .from('discussion_rubric_templates')
      .select(`
        *,
        creator:users!discussion_rubric_templates_created_by_fkey(id, name)
      `)
      .or(`is_system.eq.true,created_by.eq.${user.id}`)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching rubric templates:', error);
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });

  } catch (error) {
    console.error('Rubric templates GET error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/discussions/rubric-templates - Create a new rubric template
export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;

    // Only instructors and above can create templates
    const allowedRoles = ['admin', 'super_admin', 'instructor', 'curriculum_designer'];
    if (!userProfile?.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json({ error: "Only instructors can create rubric templates" }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const body = await request.json();
    const { name, description, rubric } = body;

    if (!name || !rubric) {
      return NextResponse.json({ error: "Name and rubric are required" }, { status: 400 });
    }

    if (!Array.isArray(rubric) || rubric.length === 0) {
      return NextResponse.json({ error: "Rubric must be a non-empty array of criteria" }, { status: 400 });
    }

    const { data: template, error } = await tq
      .from('discussion_rubric_templates')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        rubric,
        is_system: false,
        created_by: user.id
      })
      .select(`
        *,
        creator:users!discussion_rubric_templates_created_by_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating rubric template:', error);
      return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });

  } catch (error) {
    console.error('Rubric templates POST error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/discussions/rubric-templates - Update a rubric template
export async function PUT(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);


    const body = await request.json();
    const { id, name, description, rubric } = body;

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    // Check if template exists and user can edit it
    const { data: existingTemplate, error: fetchError } = await tq
      .from('discussion_rubric_templates')
      .select('id, created_by, is_system')
      .eq('id', id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Only creator or super_admin can edit
    const isSuperAdmin = userProfile?.role === 'super_admin';
    if (existingTemplate.created_by !== user.id && !isSuperAdmin) {
      return NextResponse.json({ error: "You can only edit your own templates" }, { status: 403 });
    }

    // System templates can only be edited by super_admin
    if (existingTemplate.is_system && !isSuperAdmin) {
      return NextResponse.json({ error: "System templates cannot be modified" }, { status: 403 });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (rubric !== undefined) updateData.rubric = rubric;

    const { data: template, error: updateError } = await tq
      .from('discussion_rubric_templates')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:users!discussion_rubric_templates_created_by_fkey(id, name)
      `)
      .single();

    if (updateError) {
      console.error('Error updating rubric template:', updateError);
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
    }

    return NextResponse.json({ template });

  } catch (error) {
    console.error('Rubric templates PUT error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/discussions/rubric-templates - Delete a rubric template
export async function DELETE(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    // Check if template exists and user can delete it
    const { data: existingTemplate, error: fetchError } = await tq
      .from('discussion_rubric_templates')
      .select('id, created_by, is_system')
      .eq('id', id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // System templates cannot be deleted
    if (existingTemplate.is_system) {
      return NextResponse.json({ error: "System templates cannot be deleted" }, { status: 403 });
    }

    // Only creator or super_admin can delete
    const isSuperAdmin = userProfile?.role === 'super_admin';
    if (existingTemplate.created_by !== user.id && !isSuperAdmin) {
      return NextResponse.json({ error: "You can only delete your own templates" }, { status: 403 });
    }

    const { error: deleteError } = await tq
      .from('discussion_rubric_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting rubric template:', deleteError);
      return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Rubric templates DELETE error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
