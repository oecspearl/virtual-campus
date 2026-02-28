import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

// Tables to export (ordered by dependency)
const EXPORT_TABLES = [
  'users',
  'courses',
  'subjects',
  'programmes',
  'learning_paths',
  'competencies',
  'course_categories',
  'site_settings',
  'lessons',
  'classes',
  'course_instructors',
  'programme_courses',
  'quizzes',
  'assignments',
  'grade_items',
  'enrollments',
  'programme_enrollments',
  'learning_path_enrollments',
];

// GET - Export all tenant data as JSON (super_admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin'])) {
      return createAuthResponse('Forbidden: Super admin access required', 403);
    }

    const { id: tenantId } = await params;
    const serviceSupabase = createServiceSupabaseClient();

    // Verify tenant exists
    const { data: tenant } = await serviceSupabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Export data from each table scoped to this tenant
    const exportData: Record<string, any[]> = {};

    for (const table of EXPORT_TABLES) {
      try {
        const { data, error } = await serviceSupabase
          .from(table)
          .select('*')
          .eq('tenant_id', tenantId);

        if (!error && data) {
          exportData[table] = data;
        }
      } catch {
        // Skip tables that don't exist or have errors
        exportData[table] = [];
      }
    }

    // Also export tenant memberships
    const { data: memberships } = await serviceSupabase
      .from('tenant_memberships')
      .select('*')
      .eq('tenant_id', tenantId);

    exportData['tenant_memberships'] = memberships || [];

    const exportPayload = {
      tenant,
      exported_at: new Date().toISOString(),
      exported_by: authResult.user.id,
      data: exportData,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tenant-${tenant.slug}-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Tenant export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
