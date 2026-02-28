import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

// Tables to import (ordered by dependency — parents first)
const IMPORT_ORDER = [
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

// POST - Import data into a tenant from JSON export (super_admin only)
export async function POST(
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

    // Verify target tenant exists
    const { data: tenant } = await serviceSupabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Target tenant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { data: importData } = body;

    if (!importData || typeof importData !== 'object') {
      return NextResponse.json({ error: 'Invalid import payload. Expected { data: { table: rows[] } }' }, { status: 400 });
    }

    const results: Record<string, { imported: number; errors: number }> = {};

    for (const table of IMPORT_ORDER) {
      const rows = importData[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        results[table] = { imported: 0, errors: 0 };
        continue;
      }

      // Re-assign tenant_id to target tenant and strip IDs to avoid conflicts
      const mappedRows = rows.map((row: Record<string, any>) => {
        const { id, ...rest } = row;
        return { ...rest, tenant_id: tenantId };
      });

      // Insert in batches of 100
      let imported = 0;
      let errors = 0;
      for (let i = 0; i < mappedRows.length; i += 100) {
        const batch = mappedRows.slice(i, i + 100);
        const { error } = await serviceSupabase.from(table).insert(batch);
        if (error) {
          errors += batch.length;
        } else {
          imported += batch.length;
        }
      }

      results[table] = { imported, errors };
    }

    return NextResponse.json({
      message: 'Import completed',
      tenant: tenant.name,
      results,
    });
  } catch (error) {
    console.error('Tenant import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
