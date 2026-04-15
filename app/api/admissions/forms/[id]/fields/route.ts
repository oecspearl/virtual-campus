import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
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

    const { data: fields, error } = await supabase
      .from('admission_form_fields')
      .select('*')
      .eq('form_id', id)
      .order('order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 });
    }

    return NextResponse.json({ fields: fields || [] });
  } catch (error) {
    console.error('Fields list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: formId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { fields } = await request.json();

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'Fields must be an array' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // Delete existing fields and reinsert
    await supabase
      .from('admission_form_fields')
      .delete()
      .eq('form_id', formId);

    if (fields.length > 0) {
      const fieldsToInsert = fields.map((field: Record<string, unknown>, index: number) => ({
        form_id: formId,
        type: field.type,
        label: field.label,
        description: field.description || null,
        placeholder: field.placeholder || null,
        order: field.order ?? index,
        required: field.required ?? false,
        options: field.options || {},
        section: field.section || null,
      }));

      const { error: insertError } = await supabase
        .from('admission_form_fields')
        .insert(fieldsToInsert);

      if (insertError) {
        console.error('Error inserting fields:', insertError);
        return NextResponse.json({ error: 'Failed to save fields' }, { status: 500 });
      }
    }

    // Fetch the saved fields
    const { data: savedFields } = await supabase
      .from('admission_form_fields')
      .select('*')
      .eq('form_id', formId)
      .order('order', { ascending: true });

    return NextResponse.json({ fields: savedFields || [] });
  } catch (error) {
    console.error('Fields save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
