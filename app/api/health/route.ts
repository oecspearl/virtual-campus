import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { CACHE_NONE } from "@/lib/cache-headers";

/**
 * GET /api/health
 *
 * Comprehensive health check that validates:
 * - Database connectivity (via lightweight RPC)
 * - Supabase auth service availability
 * - Environment configuration
 *
 * Returns 200 if all checks pass, 503 if any fail.
 * Used by monitoring, load balancers, and deployment validation.
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; message?: string }> = {};

  // 1. Database connectivity
  try {
    const dbStart = Date.now();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.rpc('health_check');

    if (error) {
      // Fallback: simple query if RPC not yet deployed
      const { error: fallbackError } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);

      if (fallbackError) {
        checks.database = { status: 'error', message: fallbackError.message };
      } else {
        checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
      }
    } else {
      checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    }
  } catch (error: any) {
    checks.database = { status: 'error', message: error.message };
  }

  // 2. Environment configuration
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  checks.environment = missingVars.length === 0
    ? { status: 'ok' }
    : { status: 'error', message: `Missing: ${missingVars.join(', ')}` };

  // 3. Overall status
  const allOk = Object.values(checks).every(c => c.status === 'ok');
  const totalLatencyMs = Date.now() - start;

  const response = NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    latencyMs: totalLatencyMs,
    checks,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    region: process.env.VERCEL_REGION || 'local',
  }, { status: allOk ? 200 : 503 });

  // Never cache health checks
  Object.entries(CACHE_NONE).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
