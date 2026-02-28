import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/database-helpers';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const courseId = searchParams.get('course_id');

    if (!connectionId) {
      return NextResponse.json({ error: 'connection_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('sonisweb_grade_sync_config')
      .select('*')
      .eq('connection_id', connectionId);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching grade sync config:', error);
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Grade config GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      connection_id,
      course_id,
      enabled,
      sync_mode,
      grade_format,
      sonisweb_course_code,
      sonisweb_section,
      grade_items,
    } = body;

    if (!connection_id || !course_id) {
      return NextResponse.json(
        { error: 'connection_id and course_id are required' },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('sonisweb_grade_sync_config')
      .upsert({
        connection_id,
        course_id,
        enabled: enabled ?? false,
        sync_mode: sync_mode || 'manual',
        grade_format: grade_format || 'percentage',
        sonisweb_course_code: sonisweb_course_code || null,
        sonisweb_section: sonisweb_section || null,
        grade_items: grade_items || [],
        configured_by: authResult.userProfile.id,
      }, { onConflict: 'connection_id,course_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving grade sync config:', error);
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Grade config POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
