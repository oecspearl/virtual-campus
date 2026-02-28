/**
 * ETL Pipeline API
 * Manage and execute ETL pipelines
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { runETLPipeline, getDataWarehouseConfig } from '@/lib/analytics/etl';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can run ETL pipelines
    if (!hasRole(authResult.userProfile, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { warehouse_id, pipeline } = body;

    if (!warehouse_id || !pipeline) {
      return NextResponse.json(
        { error: 'warehouse_id and pipeline are required' },
        { status: 400 }
      );
    }

    const result = await runETLPipeline(warehouse_id, pipeline);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to run pipeline' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job_id: result.jobId,
    });
  } catch (error: any) {
    console.error('ETL pipeline error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const warehouseId = searchParams.get('warehouse_id');

    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from('etl_pipeline_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('ETL jobs query error:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    return NextResponse.json(jobs || []);
  } catch (error: any) {
    console.error('ETL pipeline GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

