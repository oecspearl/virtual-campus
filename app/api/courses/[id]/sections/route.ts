import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';

// GET /api/courses/[id]/sections — list sections for a course
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params;
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const { data: sections, error } = await tq
      .from('course_sections')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Sections GET error:', error);
      return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
    }

    return NextResponse.json({ sections: sections || [] });
  } catch (e: any) {
    console.error('Sections GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/courses/[id]/sections — create a new section
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params;

    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Check permission: admin, instructor of this course, or curriculum_designer
    const isAdmin = hasRole(userProfile.role, ["admin", "super_admin", "curriculum_designer"]);
    let isInstructor = false;
    if (!isAdmin) {
      const { data: instructorCheck } = await tq
        .from('course_instructors')
        .select('id')
        .eq('course_id', courseId)
        .eq('instructor_id', user.id)
        .single();
      isInstructor = !!instructorCheck;
    }

    if (!isAdmin && !isInstructor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Section title is required" }, { status: 400 });
    }

    // Get next order number
    const { data: existing } = await tq
      .from('course_sections')
      .select('order')
      .eq('course_id', courseId)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = (existing && existing.length > 0) ? existing[0].order + 1 : 0;

    const { data: section, error } = await tq
      .from('course_sections')
      .insert({
        course_id: courseId,
        tenant_id: tenantId,
        title: body.title.trim(),
        description: body.description || null,
        order: body.order ?? nextOrder,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        published: body.published ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Section create error:', error);
      return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
    }

    return NextResponse.json(section, { status: 201 });
  } catch (e: any) {
    console.error('Sections POST API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/courses/[id]/sections — bulk update sections (reorder, update)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params;

    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const isAdmin = hasRole(userProfile.role, ["admin", "super_admin", "curriculum_designer"]);
    let isInstructor = false;
    if (!isAdmin) {
      const { data: instructorCheck } = await tq
        .from('course_instructors')
        .select('id')
        .eq('course_id', courseId)
        .eq('instructor_id', user.id)
        .single();
      isInstructor = !!instructorCheck;
    }

    if (!isAdmin && !isInstructor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Single section update
    if (body.id) {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.order !== undefined) updateData.order = body.order;
      if (body.start_date !== undefined) updateData.start_date = body.start_date;
      if (body.end_date !== undefined) updateData.end_date = body.end_date;
      if (body.collapsed !== undefined) updateData.collapsed = body.collapsed;
      if (body.published !== undefined) updateData.published = body.published;

      const { data: section, error } = await tq
        .from('course_sections')
        .update(updateData)
        .eq('id', body.id)
        .eq('course_id', courseId)
        .select()
        .single();

      if (error) {
        console.error('Section update error:', error);
        return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
      }

      return NextResponse.json(section);
    }

    // Bulk reorder: expects { sections: [{ id, order }] }
    if (body.sections && Array.isArray(body.sections)) {
      for (const s of body.sections) {
        await tq
          .from('course_sections')
          .update({ order: s.order, updated_at: new Date().toISOString() })
          .eq('id', s.id)
          .eq('course_id', courseId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (e: any) {
    console.error('Sections PUT API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/courses/[id]/sections — delete a section (via query param ?section_id=...)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params;
    const url = new URL(request.url);
    const sectionId = url.searchParams.get('section_id');

    if (!sectionId) {
      return NextResponse.json({ error: "section_id query parameter required" }, { status: 400 });
    }

    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const isAdmin = hasRole(userProfile.role, ["admin", "super_admin", "curriculum_designer"]);
    let isInstructor = false;
    if (!isAdmin) {
      const { data: instructorCheck } = await tq
        .from('course_instructors')
        .select('id')
        .eq('course_id', courseId)
        .eq('instructor_id', user.id)
        .single();
      isInstructor = !!instructorCheck;
    }

    if (!isAdmin && !isInstructor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Unlink lessons from this section (don't delete them)
    await tq
      .from('lessons')
      .update({ section_id: null })
      .eq('section_id', sectionId);

    // Delete the section
    const { error } = await tq
      .from('course_sections')
      .delete()
      .eq('id', sectionId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Section delete error:', error);
      return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Sections DELETE API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
