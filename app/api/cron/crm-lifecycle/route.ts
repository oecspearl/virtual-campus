import { NextRequest, NextResponse } from 'next/server';
import { autoTransitionStages } from '@/lib/crm/lifecycle-service';

/**
 * CRM Lifecycle Auto-Transition Cron Job
 *
 * GET /api/cron/crm-lifecycle
 *
 * Auto-transitions students between lifecycle stages based on rules:
 * - New students → prospect
 * - prospect → onboarding (first enrollment)
 * - onboarding → active (first lesson completed OR 7 days)
 * - active → at_risk (risk_score > 50)
 * - at_risk → active (risk_score < 30)
 * - active → completing (all courses > 90%)
 * - completing → alumni (all courses completed)
 *
 * Recommended: Run daily at 2 AM
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await autoTransitionStages();

    return NextResponse.json({
      success: true,
      message: `Processed lifecycle transitions`,
      transitioned: results.transitioned,
      errors: results.errors.length > 0 ? results.errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('CRM Lifecycle cron error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
