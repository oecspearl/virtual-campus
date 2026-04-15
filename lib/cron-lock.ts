import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

/**
 * Distributed locking for cron jobs.
 *
 * Prevents duplicate execution when:
 * - Vercel retries a timed-out cron invocation
 * - Multiple serverless instances fire simultaneously
 * - Manual trigger overlaps with scheduled execution
 *
 * Uses the `cron_runs` table (created in migration 023) as a lock store.
 * A job is considered locked if there's a 'running' record that started
 * within the lock timeout window.
 */

interface CronLockResult {
  acquired: boolean;
  runId?: string;
  message?: string;
}

/**
 * Attempt to acquire a lock for a cron job.
 *
 * @param jobName - Unique identifier for the cron job (e.g., 'assignment-reminders')
 * @param lockTimeoutMinutes - How long a lock is held before considered stale (default: 10)
 * @returns Lock result with the run ID if acquired
 */
export async function acquireCronLock(
  jobName: string,
  lockTimeoutMinutes: number = 10
): Promise<CronLockResult> {
  const supabase = createServiceSupabaseClient();
  const cutoff = new Date(Date.now() - lockTimeoutMinutes * 60 * 1000).toISOString();

  try {
    // Check for an active lock (running job started within the timeout window)
    const { data: activeLock } = await supabase
      .from('cron_runs')
      .select('id, started_at')
      .eq('job_name', jobName)
      .eq('status', 'running')
      .gte('started_at', cutoff)
      .limit(1)
      .single();

    if (activeLock) {
      logger.warn('Cron lock already held', {
        source: `cron/${jobName}`,
        existingRunId: activeLock.id,
        startedAt: activeLock.started_at,
      });
      return {
        acquired: false,
        message: `Job ${jobName} is already running (started ${activeLock.started_at})`,
      };
    }

    // Mark stale locks as failed
    await supabase
      .from('cron_runs')
      .update({ status: 'failed', error: 'Lock timeout — marked as stale' })
      .eq('job_name', jobName)
      .eq('status', 'running')
      .lt('started_at', cutoff);

    // Insert a new lock record
    const { data: run, error } = await supabase
      .from('cron_runs')
      .insert({
        job_name: jobName,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to acquire cron lock', { source: `cron/${jobName}` }, error);
      return { acquired: false, message: 'Failed to create lock record' };
    }

    return { acquired: true, runId: run.id };
  } catch (error) {
    logger.error('Cron lock error', { source: `cron/${jobName}` }, error);
    return { acquired: false, message: 'Lock acquisition failed' };
  }
}

/**
 * Release a cron lock by marking the run as completed or failed.
 */
export async function releaseCronLock(
  runId: string,
  status: 'completed' | 'failed',
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const supabase = createServiceSupabaseClient();

  await supabase
    .from('cron_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      result: result || null,
      error: error || null,
    })
    .eq('id', runId);
}

/**
 * Wraps a cron job handler with distributed locking.
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withCronLock('assignment-reminders', request, async () => {
 *     // Your cron job logic here
 *     return { processed: 5, sent: 3 };
 *   });
 * }
 * ```
 */
export async function withCronLock<T extends Record<string, unknown>>(
  jobName: string,
  request: { headers: { get(name: string): string | null } },
  handler: () => Promise<T>,
  lockTimeoutMinutes: number = 10
): Promise<Response> {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lock = await acquireCronLock(jobName, lockTimeoutMinutes);

  if (!lock.acquired) {
    return Response.json(
      { error: 'Job already running', message: lock.message },
      { status: 409 }
    );
  }

  try {
    const result = await handler();
    await releaseCronLock(lock.runId!, 'completed', result);

    return Response.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    await releaseCronLock(lock.runId!, 'failed', undefined, error?.message);

    logger.error(`Cron job ${jobName} failed`, { source: `cron/${jobName}` }, error);

    return Response.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}
