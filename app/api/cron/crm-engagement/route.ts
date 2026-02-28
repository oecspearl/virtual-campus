import { NextRequest, NextResponse } from 'next/server';
import { calculateAllEngagementScores } from '@/lib/crm/engagement-engine';

/**
 * CRM Engagement Score Calculation Cron Job
 *
 * GET /api/cron/crm-engagement
 *
 * Calculates engagement scores for all students.
 * Recommended: Run daily at 3 AM (after lifecycle cron at 2 AM).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await calculateAllEngagementScores();

    return NextResponse.json({
      success: true,
      message: `Calculated engagement scores`,
      calculated: results.calculated,
      errors: results.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('CRM Engagement cron error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
