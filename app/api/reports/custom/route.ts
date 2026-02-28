/**
 * Custom Reports API
 * Create and execute custom reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('report_type');
    const shared = searchParams.get('shared') === 'true';

    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from('custom_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (reportType) {
      query = query.eq('report_type', reportType);
    }

    if (shared) {
      query = query.eq('is_shared', true);
    } else {
      // Show user's own reports and shared reports
      query = query.or(`created_by.eq.${authResult.user.id},is_shared.eq.true`);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('Custom reports query error:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    return NextResponse.json(reports || []);
  } catch (error: any) {
    console.error('Custom reports GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only instructors and above can create reports
    if (authResult.userProfile.role !== 'instructor' && 
        authResult.userProfile.role !== 'admin' && 
        authResult.userProfile.role !== 'super_admin' &&
        authResult.userProfile.role !== 'curriculum_designer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      report_type,
      base_table,
      columns,
      filters,
      group_by,
      order_by,
      limit_count,
      chart_type,
      chart_config,
      is_shared,
      shared_with_roles,
    } = body;

    if (!name || !report_type || !columns || columns.length === 0) {
      return NextResponse.json(
        { error: 'name, report_type, and columns are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data: report, error } = await supabase
      .from('custom_reports')
      .insert({
        name,
        description: description || null,
        created_by: authResult.user?.id,
        report_type,
        base_table: base_table || null,
        columns,
        filters: filters || [],
        group_by: group_by || [],
        order_by: order_by || [],
        limit_count: limit_count || null,
        chart_type: chart_type || null,
        chart_config: chart_config || {},
        is_shared: is_shared || false,
        shared_with_roles: shared_with_roles || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Custom report creation error:', error);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    console.error('Custom reports POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

