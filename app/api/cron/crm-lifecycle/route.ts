import { NextRequest } from 'next/server';
import { autoTransitionStages } from '@/lib/crm/lifecycle-service';
import { withCronLock } from '@/lib/cron-lock';

/**
 * CRM Lifecycle Auto-Transition Cron Job
 *
 * GET /api/cron/crm-lifecycle
 *
 * Auto-transitions students between lifecycle stages based on rules.
 * Protected by CRON_SECRET and distributed lock.
 * Recommended: Run daily at 2 AM.
 */
export async function GET(request: NextRequest) {
  return withCronLock('crm-lifecycle', request, async () => {
    const results = await autoTransitionStages();
    return {
      transitioned: results.transitioned,
      errors: results.errors.length > 0 ? results.errors : undefined,
    };
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
