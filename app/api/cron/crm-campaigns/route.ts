import { NextRequest } from 'next/server';
import { processScheduledCampaigns } from '@/lib/crm/campaign-service';
import { withCronLock } from '@/lib/cron-lock';

/**
 * CRM Campaign Processor Cron Job
 *
 * GET /api/cron/crm-campaigns
 *
 * Sends scheduled campaigns that are due.
 * Protected by CRON_SECRET and distributed lock.
 * Recommended: Run every 15 minutes.
 */
export async function GET(request: NextRequest) {
  return withCronLock('crm-campaigns', request, async () => {
    const results = await processScheduledCampaigns();
    return {
      processed: results.processed,
      errors: results.errors,
    };
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
