import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

/**
 * GET /api/accessibility/report
 * Get accessibility report for content
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('content_type');
    const contentId = searchParams.get('content_id');

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'content_type and content_id are required' },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq.from('accessibility_reports')
      .select('*')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching accessibility report:', error);
      return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }

    return NextResponse.json({ report: data || null });
  } catch (error) {
    console.error('Error in accessibility report GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/accessibility/report
 * Save accessibility report for content
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    const body = await request.json();
    const { content_type, content_id, issues, score } = body;

    if (!content_type || !content_id) {
      return NextResponse.json(
        { error: 'content_type and content_id are required' },
        { status: 400 }
      );
    }

    // Upsert the report (update if exists, insert if not)
    const { data, error } = await tq.from('accessibility_reports')
      .upsert({
        content_type,
        content_id,
        issues: issues || [],
        score: score ?? null,
        checked_at: new Date().toISOString(),
        checked_by: user.id,
      }, {
        onConflict: 'content_type,content_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving accessibility report:', error);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error('Error in accessibility report POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
