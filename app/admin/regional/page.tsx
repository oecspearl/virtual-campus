'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import RoleGuard from '@/app/components/RoleGuard';
import { ResponsiveTable } from '@/app/components/ui/ResponsiveTable';

interface PerTenant {
  tenant: { id: string; name: string; slug: string; status: string };
  outgoing_shares: number;
  network_wide_shares: number;
  incoming_cross_tenant_enrollments: number;
  issued_cross_tenant_enrollments: number;
  issued_completions: number;
  credit_records_received: number;
  credit_records_approved_as_receiver: number;
  credits_awarded_as_receiver: number;
  credit_records_issued: number;
  credit_records_approved_as_issuer: number;
}

interface Flow {
  issuing_tenant_id: string;
  issuing_tenant_name: string;
  receiving_tenant_id: string;
  receiving_tenant_name: string;
  record_count: number;
}

interface Regional {
  range: { since: string | null; until: string | null };
  totals: {
    tenants: number;
    active_shares: number;
    network_wide_shares: number;
    cross_tenant_enrollments: number;
    cross_tenant_completions: number;
    credit_records: number;
    credit_records_by_status: Record<string, number>;
    credits_awarded: number;
  };
  per_tenant: PerTenant[];
  flows: Flow[];
}

export default function RegionalCollaborationPage() {
  return (
    <RoleGuard
      roles={['super_admin']}
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-sm text-gray-600">Super admin access required.</p>
        </div>
      }
    >
      <Inner />
    </RoleGuard>
  );
}

function Inner() {
  const [data, setData] = useState<Regional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState<string>('');
  const [until, setUntil] = useState<string>('');

  const load = useCallback(async (rangeSince: string, rangeUntil: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (rangeSince) params.set('since', rangeSince);
      if (rangeUntil) params.set('until', rangeUntil);
      const qs = params.toString();
      const res = await fetch(`/api/admin/system/regional-stats${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      setData(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(since, until);
    // Re-run when the user applies a range; initial call has empty strings
  }, [load, since, until]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-white rounded-lg border border-gray-200 animate-pulse" />
          <div className="h-64 bg-white rounded-lg border border-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Failed to load regional stats'}
          </div>
        </div>
      </div>
    );
  }

  const { totals, per_tenant, flows } = data;
  const status = totals.credit_records_by_status;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">Regional Collaboration</h1>
            <p className="text-sm text-gray-600">
              Cross-tenant catalogue, enrolments, and credit transfer across the network
              {(data.range.since || data.range.until) && (
                <span className="ml-2 text-gray-500">
                  ({data.range.since || '…'} → {data.range.until || 'today'})
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-600">
              From
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-md text-xs"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              To
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-md text-xs"
              />
            </label>
            {(since || until) && (
              <button
                onClick={() => {
                  setSince('');
                  setUntil('');
                }}
                className="text-xs text-gray-500 hover:text-gray-900 underline"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => exportCsv('per-tenant', per_tenant)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50"
            >
              <Icon icon="mdi:download" className="w-3.5 h-3.5" />
              Per-institution CSV
            </button>
            <button
              onClick={() => exportCsv('flows', flows)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50"
            >
              <Icon icon="mdi:download" className="w-3.5 h-3.5" />
              Flows CSV
            </button>
          </div>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat label="Institutions" value={totals.tenants} icon="mdi:domain" />
          <Stat label="Active shares" value={totals.active_shares} icon="mdi:share-variant" />
          <Stat label="Network-wide" value={totals.network_wide_shares} icon="mdi:earth" />
          <Stat
            label="Cross-tenant enrolments"
            value={totals.cross_tenant_enrollments}
            icon="mdi:account-switch"
          />
          <Stat label="Completions" value={totals.cross_tenant_completions} icon="mdi:trophy" />
          <Stat label="Credit records" value={totals.credit_records} icon="mdi:file-document" />
          <Stat
            label="Credits awarded"
            value={totals.credits_awarded.toFixed(1)}
            icon="mdi:swap-horizontal"
          />
        </div>

        {/* Credit status */}
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Credit transfer pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatusPill label="Pending" value={status.pending || 0} tone="amber" />
            <StatusPill label="Under review" value={status.under_review || 0} tone="blue" />
            <StatusPill label="Approved" value={status.approved || 0} tone="green" />
            <StatusPill label="Rejected" value={status.rejected || 0} tone="red" />
            <StatusPill label="Withdrawn" value={status.withdrawn || 0} tone="gray" />
          </div>
        </section>

        {/* Per-tenant */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">By institution</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Catalogue-share and credit-transfer activity, per tenant
            </p>
          </div>
          <ResponsiveTable<PerTenant>
            caption="Per-institution catalogue and credit-transfer activity"
            rows={per_tenant}
            rowKey={(t) => t.tenant.id}
            empty="No institutions yet"
            columns={[
              {
                key: 'institution',
                header: 'Institution',
                primary: true,
                render: (t) => (
                  <>
                    <p className="font-medium text-gray-900">{t.tenant.name}</p>
                    <p className="text-xs text-gray-500">
                      {t.tenant.slug}
                      {t.tenant.status !== 'active' && (
                        <span className="ml-2 text-amber-600 capitalize">{t.tenant.status}</span>
                      )}
                    </p>
                  </>
                ),
              },
              { key: 'outgoing_shares', header: 'Targeted shares', mobileLabel: 'Targeted shares', align: 'right', render: (t) => t.outgoing_shares },
              { key: 'network_wide_shares', header: 'Network-wide shares', mobileLabel: 'Network-wide', align: 'right', render: (t) => t.network_wide_shares },
              { key: 'in_enrolments', header: 'Outbound enrolments', mobileLabel: 'Outbound', align: 'right', render: (t) => t.incoming_cross_tenant_enrollments },
              { key: 'out_enrolments', header: 'Inbound enrolments', mobileLabel: 'Inbound', align: 'right', render: (t) => t.issued_cross_tenant_enrollments },
              { key: 'completions', header: 'Inbound completions', mobileLabel: 'Completions', align: 'right', render: (t) => t.issued_completions },
              { key: 'transfers_in', header: 'Transfers in', mobileLabel: 'Transfers in', align: 'right', render: (t) => t.credit_records_received },
              {
                key: 'transfers_approved',
                header: 'Transfers approved',
                mobileLabel: 'Approved',
                align: 'right',
                render: (t) => <span className="text-green-700">{t.credit_records_approved_as_receiver}</span>,
              },
              {
                key: 'credits_awarded',
                header: 'Credits awarded',
                mobileLabel: 'Credits awarded',
                align: 'right',
                render: (t) => <span className="font-medium">{Number(t.credits_awarded_as_receiver).toFixed(1)}</span>,
              },
              { key: 'transfers_out', header: 'Transfers out', mobileLabel: 'Transfers out', align: 'right', render: (t) => t.credit_records_issued },
            ]}
          />
        </section>

        {/* Flow matrix */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Credit-transfer flows</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Issuing institution → reviewing institution, all submissions regardless of status
            </p>
          </div>
          <div className="p-2 md:p-0">
            <ResponsiveTable<Flow>
              caption="Credit-transfer flows"
              rows={flows}
              rowKey={(f, i) => `${f.issuing_tenant_id}->${f.receiving_tenant_id}-${i}`}
              empty="No credit flows yet."
              columns={[
                {
                  key: 'from',
                  header: 'From (issuer)',
                  primary: true,
                  render: (f) => f.issuing_tenant_name,
                },
                {
                  key: 'to',
                  header: 'To (reviewer)',
                  render: (f) => (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="mdi:arrow-right" className="w-3.5 h-3.5 text-gray-400 md:hidden" />
                      {f.receiving_tenant_name}
                    </span>
                  ),
                },
                {
                  key: 'records',
                  header: 'Records',
                  align: 'right',
                  render: (f) => <span className="font-medium text-gray-900">{f.record_count}</span>,
                },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function flattenForCsv(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    const walk = (obj: any, prefix: string) => {
      for (const [k, v] of Object.entries(obj || {})) {
        const key = prefix ? `${prefix}_${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, key);
        else out[key] = v;
      }
    };
    walk(r as any, '');
    return out;
  });
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Array.from(
    rows.reduce<Set<string>>((s, r) => {
      Object.keys(r).forEach((k) => s.add(k));
      return s;
    }, new Set()),
  );
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

function exportCsv(name: string, rows: unknown[]) {
  const flat = flattenForCsv(rows);
  const csv = toCsv(flat);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `regional-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon icon={icon} className="w-4 h-4 text-gray-400" />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'gray';
}) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    green: 'bg-green-50 text-green-800 border-green-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    gray: 'bg-gray-50 text-gray-800 border-gray-200',
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <p className="text-xs">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}
