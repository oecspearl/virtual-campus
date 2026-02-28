import { NextRequest, NextResponse } from 'next/server';
import { processScoreThresholdWorkflows } from '@/lib/crm/workflow-engine';

/**
 * CRM Workflow Processor Cron Job
 *
 * GET /api/cron/crm-workflows
 *
 * Processes score-threshold workflows.
 * Recommended: Run every 30 minutes.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await processScoreThresholdWorkflows();

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} threshold triggers`,
      processed: results.processed,
      errors: results.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('CRM Workflows cron error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
