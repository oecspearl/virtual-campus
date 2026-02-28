/**
 * Execute Custom Report
 * Runs a custom report and returns results
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceSupabaseClient();

    // Get report
    const { data: report, error: reportError } = await supabase
      .from('custom_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check access
    if (report.created_by !== authResult.user.id && !report.is_shared) {
      if (authResult.userProfile?.role !== 'admin' && 
          authResult.userProfile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Create execution record
    const startTime = Date.now();
    const { data: execution } = await supabase
      .from('custom_report_executions')
      .insert({
        report_id: id,
        executed_by: authResult.user.id,
        status: 'running',
      })
      .select()
      .single();

    try {
      // Build query based on report configuration
      let query = supabase.from(report.base_table || 'users').select(report.columns.join(','));

      // Apply filters
      if (report.filters && report.filters.length > 0) {
        for (const filter of report.filters) {
          if (filter.operator === 'eq') {
            // @ts-expect-error - excessive type depth with dynamic query building
            query = query.eq(filter.column, filter.value);
          } else if (filter.operator === 'in') {
            query = query.in(filter.column, filter.value);
          } else if (filter.operator === 'gte') {
            query = query.gte(filter.column, filter.value);
          } else if (filter.operator === 'lte') {
            query = query.lte(filter.column, filter.value);
          } else if (filter.operator === 'like') {
            query = query.like(filter.column, `%${filter.value}%`);
          }
        }
      }

      // Apply ordering
      if (report.order_by && report.order_by.length > 0) {
        for (const order of report.order_by) {
          query = query.order(order.column, { ascending: order.direction !== 'desc' });
        }
      }

      // Apply limit
      if (report.limit_count) {
        query = query.limit(report.limit_count);
      }

      const { data: results, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      const executionTime = Date.now() - startTime;

      // Update execution record
      await supabase
        .from('custom_report_executions')
        .update({
          status: 'completed',
          result_count: results?.length || 0,
          execution_time_ms: executionTime,
          result_data: results || [],
        })
        .eq('id', execution.id);

      // Update report run count
      await supabase
        .from('custom_reports')
        .update({
          last_run_at: new Date().toISOString(),
          run_count: (report.run_count || 0) + 1,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        data: results || [],
        execution_time_ms: executionTime,
        result_count: results?.length || 0,
      });
    } catch (error: any) {
      // Update execution with error
      await supabase
        .from('custom_report_executions')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', execution.id);

      throw error;
    }
  } catch (error: any) {
    console.error('Report execution error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

