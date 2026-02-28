import { NextRequest, NextResponse } from 'next/server';
import { processScheduledCampaigns } from '@/lib/crm/campaign-service';

/**
 * CRM Campaign Processor Cron Job
 *
 * GET /api/cron/crm-campaigns
 *
 * Sends scheduled campaigns that are due.
 * Recommended: Run every 15 minutes.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await processScheduledCampaigns();

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} scheduled campaigns`,
      processed: results.processed,
      errors: results.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('CRM Campaigns cron error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
