import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from '@/lib/database-helpers';
import { hasRole } from '@/lib/rbac';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Build query for assignments that should appear in curriculum
    let query = tq
      .from('assignments')
      .select('id, title, description, points, due_date, published, curriculum_order')
      .eq('course_id', courseId)
      .eq('show_in_curriculum', true)
      .order('curriculum_order', { ascending: true, nullsFirst: false });

    // If not an instructor/admin, only show published assignments
    if (!user || !hasRole(user.role, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      query = query.eq('published', true);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Error fetching curriculum assignments:', error);
      return NextResponse.json({ error: 'Failed to fetch curriculum assignments' }, { status: 500 });
    }

    return NextResponse.json({ assignments: assignments || [] });
  } catch (error) {
    console.error('Curriculum assignments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
