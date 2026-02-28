import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const supabase = createServiceSupabaseClient();

    const { data: forms, error } = await supabase
      .from('admission_forms')
      .select('*, programmes(title)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching forms:', error);
      return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
    }

    // Get application counts per form
    const formsWithCounts = await Promise.all(
      (forms || []).map(async (form) => {
        const { count } = await supabase
          .from('admission_applications')
          .select('id', { count: 'exact', head: true })
          .eq('form_id', form.id);

        return {
          ...form,
          programme_title: form.programmes?.title || null,
          application_count: count || 0,
        };
      })
    );

    return NextResponse.json({ forms: formsWithCounts });
  } catch (error) {
    console.error('Forms list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const body = await request.json();
    const { title, slug, description, programme_id, settings } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('admission_forms')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'A form with this slug already exists' }, { status: 409 });
    }

    const { data: form, error } = await supabase
      .from('admission_forms')
      .insert({
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: description || null,
        programme_id: programme_id || null,
        settings: settings || {},
        status: 'draft',
        created_by: authResult.userProfile.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating form:', error);
      return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
    }

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error('Form create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
