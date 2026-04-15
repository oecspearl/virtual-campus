import { NextRequest } from 'next/server';
import { processScoreThresholdWorkflows } from '@/lib/crm/workflow-engine';
import { withCronLock } from '@/lib/cron-lock';

/**
 * CRM Workflow Processor Cron Job
 *
 * GET /api/cron/crm-workflows
 *
 * Processes score-threshold workflows.
 * Protected by CRON_SECRET and distributed lock.
 * Recommended: Run every 30 minutes.
 */
export async function GET(request: NextRequest) {
  return withCronLock('crm-workflows', request, async () => {
    const results = await processScoreThresholdWorkflows();
    return {
      processed: results.processed,
      errors: results.errors,
    };
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
