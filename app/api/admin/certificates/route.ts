import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/admin/certificates
 * Get all certificates (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Only admins can view all certificates
    if (!hasRole(user.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse("Forbidden", 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const { data: certificates, error } = await tq
      .from('certificates')
      .select(`
        *,
        student:users!certificates_student_id_fkey(id, name, email),
        course:courses!certificates_course_id_fkey(id, title)
      `)
      .order('issued_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching certificates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch certificates' },
        { status: 500 }
      );
    }

    // Get total count
    const { count } = await tq
      .from('certificates')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      certificates: certificates || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Get certificates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

