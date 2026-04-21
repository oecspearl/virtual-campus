import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/admin/system/regional-stats
 * Super-admin only. Aggregates cross-tenant collaboration signals across the
 * whole platform:
 *   - Active course_shares (targeted + network-wide)
 *   - Cross-tenant enrollments by issuing and receiving tenant
 *   - Credit-record counts and awarded credits by status
 *   - Issuing → receiving credit-flow matrix
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile.role, ['super_admin'])) {
      return createAuthResponse('Forbidden: Super admin access required', 403);
    }

    const db = createServiceSupabaseClient();

    // Optional ?since=YYYY-MM-DD&until=YYYY-MM-DD filters (ISO dates).
    // If only one side is given, the other is unbounded.
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get('since');
    const untilParam = url.searchParams.get('until');
    const sinceIso = sinceParam ? `${sinceParam}T00:00:00Z` : null;
    // Use end-of-day for until so the user's "until" date is inclusive.
    const untilIso = untilParam ? `${untilParam}T23:59:59Z` : null;

    const applyRange = (q: any, column: string) => {
      if (sinceIso) q = q.gte(column, sinceIso);
      if (untilIso) q = q.lte(column, untilIso);
      return q;
    };

    // Tenants list isn't date-filtered — we always need the full set so the
    // per-tenant table can show institutions even with zero activity in range.
    const [tenantsRes, sharesRes, ctEnrollsRes, creditsRes] = await Promise.all([
      db.from('tenants').select('id, name, slug, status').order('name'),
      applyRange(
        db.from('course_shares').select('id, source_tenant_id, target_tenant_id, permission, revoked_at, created_at'),
        'created_at'
      ),
      applyRange(
        db.from('cross_tenant_enrollments').select('id, tenant_id, source_tenant_id, status, enrolled_at'),
        'enrolled_at'
      ),
      applyRange(
        db.from('credit_records').select('id, tenant_id, issuing_tenant_id, source_type, status, credits, awarded_credits, created_at'),
        'created_at'
      ),
    ]);

    const tenants = (tenantsRes.data || []) as { id: string; name: string; slug: string; status: string }[];
    const tenantById = new Map(tenants.map((t) => [t.id, t]));
    const tenantName = (id: string | null | undefined) =>
      id ? tenantById.get(id)?.name || 'Unknown tenant' : 'Unknown tenant';

    // Shares
    const shares = sharesRes.data || [];
    const activeShares = shares.filter((s: any) => !s.revoked_at);
    const sharesByTenant: Record<string, { targeted: number; network_wide: number }> = {};
    for (const s of activeShares) {
      const row = (sharesByTenant[s.source_tenant_id] ||= { targeted: 0, network_wide: 0 });
      if (s.target_tenant_id === null) row.network_wide += 1;
      else row.targeted += 1;
    }

    // Cross-tenant enrolments
    const ctEnrolls = ctEnrollsRes.data || [];
    const enrollsByReceiver: Record<string, number> = {};
    const enrollsByIssuer: Record<string, number> = {};
    const completionsByIssuer: Record<string, number> = {};
    for (const e of ctEnrolls as any[]) {
      enrollsByReceiver[e.tenant_id] = (enrollsByReceiver[e.tenant_id] || 0) + 1;
      enrollsByIssuer[e.source_tenant_id] = (enrollsByIssuer[e.source_tenant_id] || 0) + 1;
      if (e.status === 'completed') {
        completionsByIssuer[e.source_tenant_id] = (completionsByIssuer[e.source_tenant_id] || 0) + 1;
      }
    }

    // Credit records
    const creditRows = (creditsRes.data || []) as any[];
    const creditCountsByStatus: Record<string, number> = {
      pending: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
    };
    let totalAwardedCredits = 0;
    const creditsByReceiver: Record<string, { total: number; approved: number; awarded_credits: number }> = {};
    const creditsByIssuer: Record<string, { total: number; approved: number }> = {};
    const flowMatrix: Record<string, Record<string, number>> = {};

    for (const r of creditRows) {
      creditCountsByStatus[r.status] = (creditCountsByStatus[r.status] || 0) + 1;

      const receiver = (creditsByReceiver[r.tenant_id] ||= {
        total: 0,
        approved: 0,
        awarded_credits: 0,
      });
      receiver.total += 1;
      if (r.status === 'approved') {
        receiver.approved += 1;
        const awarded = Number(r.awarded_credits || 0);
        receiver.awarded_credits += awarded;
        totalAwardedCredits += awarded;
      }

      if (r.issuing_tenant_id) {
        const issuer = (creditsByIssuer[r.issuing_tenant_id] ||= { total: 0, approved: 0 });
        issuer.total += 1;
        if (r.status === 'approved') issuer.approved += 1;

        const byIssuer = (flowMatrix[r.issuing_tenant_id] ||= {});
        byIssuer[r.tenant_id] = (byIssuer[r.tenant_id] || 0) + 1;
      }
    }

    // Per-tenant summary — easier for the dashboard to render a single list
    const perTenant = tenants.map((t) => ({
      tenant: t,
      outgoing_shares: sharesByTenant[t.id]?.targeted || 0,
      network_wide_shares: sharesByTenant[t.id]?.network_wide || 0,
      incoming_cross_tenant_enrollments: enrollsByReceiver[t.id] || 0,
      issued_cross_tenant_enrollments: enrollsByIssuer[t.id] || 0,
      issued_completions: completionsByIssuer[t.id] || 0,
      credit_records_received: creditsByReceiver[t.id]?.total || 0,
      credit_records_approved_as_receiver: creditsByReceiver[t.id]?.approved || 0,
      credits_awarded_as_receiver: creditsByReceiver[t.id]?.awarded_credits || 0,
      credit_records_issued: creditsByIssuer[t.id]?.total || 0,
      credit_records_approved_as_issuer: creditsByIssuer[t.id]?.approved || 0,
    }));

    // Flow matrix in wire form: issuer → receiver → count (with tenant names for the UI)
    const flows: Array<{
      issuing_tenant_id: string;
      issuing_tenant_name: string;
      receiving_tenant_id: string;
      receiving_tenant_name: string;
      record_count: number;
    }> = [];
    for (const [issuerId, byReceiver] of Object.entries(flowMatrix)) {
      for (const [receiverId, count] of Object.entries(byReceiver)) {
        flows.push({
          issuing_tenant_id: issuerId,
          issuing_tenant_name: tenantName(issuerId),
          receiving_tenant_id: receiverId,
          receiving_tenant_name: tenantName(receiverId),
          record_count: count,
        });
      }
    }
    flows.sort((a, b) => b.record_count - a.record_count);

    return NextResponse.json({
      range: { since: sinceParam, until: untilParam },
      totals: {
        tenants: tenants.length,
        active_shares: activeShares.length,
        network_wide_shares: activeShares.filter((s: any) => s.target_tenant_id === null).length,
        cross_tenant_enrollments: ctEnrolls.length,
        cross_tenant_completions: ctEnrolls.filter((e: any) => e.status === 'completed').length,
        credit_records: creditRows.length,
        credit_records_by_status: creditCountsByStatus,
        credits_awarded: totalAwardedCredits,
      },
      per_tenant: perTenant,
      flows,
    });
  } catch (error) {
    console.error('Regional stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
