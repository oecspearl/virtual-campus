import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const supabase = createServiceSupabaseClient();

    const { data: form } = await supabase
      .from('admission_forms')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    let newStatus: string;

    if (form.status === 'draft') {
      // Need at least 1 field to publish
      const { count } = await supabase
        .from('admission_form_fields')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', id);

      if (!count || count === 0) {
        return NextResponse.json({ error: 'Add at least one field before publishing' }, { status: 400 });
      }

      newStatus = 'published';
    } else if (form.status === 'published') {
      newStatus = 'closed';
    } else {
      // closed → draft
      newStatus = 'draft';
    }

    const { data: updated, error } = await supabase
      .from('admission_forms')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ form: updated, message: `Form is now ${newStatus}` });
  } catch (error) {
    console.error('Publish toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
