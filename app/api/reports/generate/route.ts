import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { buildReportQuery, ReportConfig } from '@/lib/reports/report-engine';
import { hasRole } from '@/lib/rbac';

/**
 * POST /api/reports/generate
 * Generate a custom report
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'student';

    // Only authenticated users can generate reports
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const config: ReportConfig = body.config;

    if (!config || !config.data_sources || !config.fields) {
      return NextResponse.json(
        { error: 'Invalid report configuration' },
        { status: 400 }
      );
    }

    // Generate report
    const reportData = await buildReportQuery(config);

    return NextResponse.json({ data: reportData });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


