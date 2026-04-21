'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import RoleGuard from '@/app/components/RoleGuard';

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

  useEffect(() => {
    fetch('/api/admin/system/regional-stats')
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">Regional Collaboration</h1>
            <p className="text-sm text-gray-600">
              Cross-tenant catalogue, enrolments, and credit transfer across the network
            </p>
          </div>
          <div className="flex gap-2">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Institution</th>
                  <th className="px-4 py-3 font-medium text-right" title="Courses this tenant published to specific tenants">
                    Targeted shares
                  </th>
                  <th className="px-4 py-3 font-medium text-right" title="Courses this tenant published to the whole network">
                    Network-wide shares
                  </th>
                  <th className="px-4 py-3 font-medium text-right" title="Students of this tenant taking courses from elsewhere">
                    Outbound enrolments
                  </th>
                  <th className="px-4 py-3 font-medium text-right" title="Students from elsewhere taking this tenant's courses">
                    Inbound enrolments
                  </th>
                  <th className="px-4 py-3 font-medium text-right" title="Completed inbound enrolments">
                    Inbound completions
                  </th>
                  <th className="px-4 py-3 font-medium text-right" title="Credit records received as the reviewing institution">
                    Transfers in
                  </th>
                  <th className="px-4 py-3 font-medium text-right" title="Transfers approved to be on this tenant's transcripts">
                    Transfers approved
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Credits awarded</th>
                  <th className="px-4 py-3 font-medium text-right" title="Credit records where this tenant was the source">
                    Transfers out
                  </th>
                </tr>
              </thead>
              <tbody>
                {per_tenant.map((t) => (
                  <tr key={t.tenant.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.tenant.name}</p>
                      <p className="text-xs text-gray-500">
                        {t.tenant.slug}
                        {t.tenant.status !== 'active' && (
                          <span className="ml-2 text-amber-600 capitalize">{t.tenant.status}</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">{t.outgoing_shares}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{t.network_wide_shares}</td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {t.incoming_cross_tenant_enrollments}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {t.issued_cross_tenant_enrollments}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">{t.issued_completions}</td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {t.credit_records_received}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      {t.credit_records_approved_as_receiver}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {Number(t.credits_awarded_as_receiver).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {t.credit_records_issued}
                    </td>
                  </tr>
                ))}
                {per_tenant.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                      No institutions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Flow matrix */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Credit-transfer flows</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Issuing institution → reviewing institution, all submissions regardless of status
            </p>
          </div>
          {flows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No credit flows yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">From (issuer)</th>
                  <th className="px-4 py-3 font-medium">To (reviewer)</th>
                  <th className="px-4 py-3 font-medium text-right">Records</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((f, i) => (
                  <tr
                    key={`${f.issuing_tenant_id}->${f.receiving_tenant_id}-${i}`}
                    className="border-t border-gray-100"
                  >
                    <td className="px-4 py-3 text-gray-900">{f.issuing_tenant_name}</td>
                    <td className="px-4 py-3 text-gray-900">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon icon="mdi:arrow-right" className="w-3.5 h-3.5 text-gray-400" />
                        {f.receiving_tenant_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {f.record_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
