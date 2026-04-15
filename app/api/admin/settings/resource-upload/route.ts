import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

const SETTING_KEY = 'resource_upload_max_size_mb';
const DEFAULT_MAX_SIZE_MB = 10;

// GET - Fetch current resource upload size limit
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', SETTING_KEY)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = Row not found, which is ok (use default)
      console.error('Error fetching resource upload setting:', error);
    }

    const maxSizeMB = data?.setting_value
      ? parseInt(data.setting_value, 10)
      : DEFAULT_MAX_SIZE_MB;

    return NextResponse.json({
      maxSizeMB: isNaN(maxSizeMB) ? DEFAULT_MAX_SIZE_MB : maxSizeMB
    });
  } catch (error) {
    console.error('Resource upload setting GET error:', error);
    // Return default on error
    return NextResponse.json({ maxSizeMB: DEFAULT_MAX_SIZE_MB });
  }
}

// PUT - Update resource upload size limit (admin only)
export async function PUT(request: Request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    // Check admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { maxSizeMB } = body;

    // Validate input
    if (typeof maxSizeMB !== 'number' || maxSizeMB < 1 || maxSizeMB > 500) {
      return NextResponse.json(
        { error: 'maxSizeMB must be a number between 1 and 500' },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Upsert the setting
    const { error } = await tq
      .from('site_settings')
      .upsert({
        setting_key: SETTING_KEY,
        setting_value: maxSizeMB.toString(),
        setting_type: 'number',
        description: 'Maximum file size in MB for resource link uploads (documents, PDFs, presentations)',
        updated_at: new Date().toISOString(),
        updated_by: userProfile.id
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Error updating resource upload setting:', error);
      return NextResponse.json(
        { error: 'Failed to update setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      maxSizeMB,
      message: `Resource upload limit updated to ${maxSizeMB}MB`
    });
  } catch (error) {
    console.error('Resource upload setting PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
