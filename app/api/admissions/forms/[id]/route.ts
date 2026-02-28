import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const supabase = createServiceSupabaseClient();

    const { data: form, error } = await supabase
      .from('admission_forms')
      .select('*, programmes(id, title)')
      .eq('id', id)
      .single();

    if (error || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { data: fields } = await supabase
      .from('admission_form_fields')
      .select('*')
      .eq('form_id', id)
      .order('order', { ascending: true });

    const { count: applicationCount } = await supabase
      .from('admission_applications')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', id);

    return NextResponse.json({
      form: {
        ...form,
        programme_title: form.programmes?.title || null,
      },
      fields: fields || [],
      application_count: applicationCount || 0,
    });
  } catch (error) {
    console.error('Form detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const body = await request.json();
    const { title, slug, description, programme_id, settings } = body;

    const supabase = createServiceSupabaseClient();

    // Check slug uniqueness if changed
    if (slug) {
      const { data: existing } = await supabase
        .from('admission_forms')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'A form with this slug already exists' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (description !== undefined) updateData.description = description;
    if (programme_id !== undefined) updateData.programme_id = programme_id || null;
    if (settings !== undefined) updateData.settings = settings;

    const { data: form, error } = await supabase
      .from('admission_forms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating form:', error);
      return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Form update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const supabase = createServiceSupabaseClient();

    // Check if form has applications
    const { count } = await supabase
      .from('admission_applications')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', id);

    if (count && count > 0) {
      return NextResponse.json({ error: 'Cannot delete a form with existing applications' }, { status: 400 });
    }

    // Check form is draft
    const { data: form } = await supabase
      .from('admission_forms')
      .select('status')
      .eq('id', id)
      .single();

    if (form?.status === 'published') {
      return NextResponse.json({ error: 'Cannot delete a published form. Close it first.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('admission_forms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting form:', error);
      return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Form deleted' });
  } catch (error) {
    console.error('Form delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
