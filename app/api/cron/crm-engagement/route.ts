import { NextRequest } from 'next/server';
import { calculateAllEngagementScores } from '@/lib/crm/engagement-engine';
import { withCronLock } from '@/lib/cron-lock';

/**
 * CRM Engagement Score Calculation Cron Job
 *
 * GET /api/cron/crm-engagement
 *
 * Calculates engagement scores for all students.
 * Protected by CRON_SECRET and distributed lock.
 * Recommended: Run daily at 3 AM.
 */
export async function GET(request: NextRequest) {
  return withCronLock('crm-engagement', request, async () => {
    const results = await calculateAllEngagementScores();
    return {
      calculated: results.calculated,
      errors: results.errors,
    };
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
