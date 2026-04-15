import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const authResult = await authenticateUser(request as any);
    const user = authResult.success ? authResult.userProfile! : null;

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Build query for quizzes that should appear in curriculum
    let query = tq
      .from('quizzes')
      .select('id, title, description, points, time_limit, due_date, published, curriculum_order')
      .eq('course_id', courseId)
      .eq('show_in_curriculum', true)
      .order('curriculum_order', { ascending: true, nullsFirst: false });

    // If not an instructor/admin, only show published quizzes
    if (!user || !hasRole(user.role, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      query = query.eq('published', true);
    }

    const { data: quizzes, error } = await query;

    if (error) {
      console.error('Error fetching curriculum quizzes:', error);
      return NextResponse.json({ error: 'Failed to fetch curriculum quizzes' }, { status: 500 });
    }

    return NextResponse.json({ quizzes: quizzes || [] });
  } catch (error) {
    console.error('Curriculum quizzes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
