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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const formId = searchParams.get('form_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const supabase = createServiceSupabaseClient();

    // Build query
    let query = supabase
      .from('admission_applications')
      .select('*, admission_forms(title, slug)', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (formId) query = query.eq('form_id', formId);
    if (search) {
      query = query.or(`applicant_name.ilike.%${search}%,applicant_email.ilike.%${search}%`);
    }

    const { data: applications, count, error } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Get status counts for dashboard stats
    const statusCounts: Record<string, number> = {};
    const { data: countData } = await supabase
      .from('admission_applications')
      .select('status');

    if (countData) {
      for (const row of countData) {
        statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
      }
    }

    // Get active forms count
    const { count: activeFormsCount } = await supabase
      .from('admission_forms')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');

    return NextResponse.json({
      applications: (applications || []).map(app => ({
        ...app,
        form_title: app.admission_forms?.title || 'Unknown',
        form_slug: app.admission_forms?.slug || '',
      })),
      total: count || 0,
      page,
      limit,
      status_counts: statusCounts,
      active_forms: activeFormsCount || 0,
    });
  } catch (error) {
    console.error('Applications list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
