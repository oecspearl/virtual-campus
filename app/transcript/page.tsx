'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';

interface TranscriptResponse {
  student: { id: string; name: string; email: string } | null;
  issuing_tenant: { id: string; name: string; slug: string } | null;
  generated_at: string;
  local_completions: any[];
  cross_tenant_completions: any[];
  transferred_credits: any[];
}

export default function TranscriptPage() {
  const [data, setData] = useState<TranscriptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('student_id');

  useEffect(() => {
    const qs = studentIdParam ? `?student_id=${encodeURIComponent(studentIdParam)}` : '';
    fetch(`/api/transcript${qs}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load transcript');
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [studentIdParam]);

  const handlePrint = () => window.print();

  const handleDownloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${data.student?.name?.replace(/\s+/g, '_') || 'student'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-40 bg-white rounded-lg border border-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Failed to load transcript'}
          </div>
        </div>
      </div>
    );
  }

  const totalLocal = data.local_completions.length;
  const totalCrossTenant = data.cross_tenant_completions.length;
  const totalTransferred = data.transferred_credits.length;
  const totalAwardedCredits = data.transferred_credits.reduce(
    (sum, r) => sum + Number(r.awarded_credits || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Actions (hidden in print) */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div>
            <h1 className="text-xl font-display text-gray-900 tracking-tight">Academic Transcript</h1>
            <p className="text-sm text-gray-500">Official record of completed coursework</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadJson}>
              <Icon icon="mdi:download" className="w-4 h-4 mr-1.5" />
              Export JSON
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Icon icon="mdi:printer" className="w-4 h-4 mr-1.5" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Transcript body */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 print:border-0 print:p-0">
          {/* Header */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {data.issuing_tenant?.name || 'Institution'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Academic Transcript</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Issued: {new Date(data.generated_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-4 text-sm">
              <p className="text-gray-500">Student</p>
              <p className="font-medium text-gray-900">{data.student?.name}</p>
              <p className="text-gray-600">{data.student?.email}</p>
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <SummaryStat label="Local courses" value={totalLocal} />
            <SummaryStat label="Regional courses" value={totalCrossTenant} />
            <SummaryStat label="Transferred credits" value={totalTransferred} />
            <SummaryStat label="Credits awarded" value={totalAwardedCredits.toFixed(2)} />
          </div>

          {/* Local completions */}
          <Section title="Completed at this Institution" count={totalLocal}>
            {data.local_completions.length === 0 ? (
              <EmptyRow text="No completed local coursework yet." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3">Course</th>
                    <th className="py-2 pr-3">Subject</th>
                    <th className="py-2 pr-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.local_completions.map((e: any) => (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 text-gray-900">{e.classes?.courses?.title}</td>
                      <td className="py-2 pr-3 text-gray-600">{e.classes?.courses?.subject_area || '—'}</td>
                      <td className="py-2 pr-3 text-gray-600">
                        {e.completed_at ? new Date(e.completed_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Cross-tenant completions */}
          <Section title="Completed via Regional Catalogue" count={totalCrossTenant}>
            {data.cross_tenant_completions.length === 0 ? (
              <EmptyRow text="No regional-catalogue courses completed yet." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3">Course</th>
                    <th className="py-2 pr-3">Issuing Institution</th>
                    <th className="py-2 pr-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cross_tenant_completions.map((e: any) => (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 text-gray-900">{e.course?.title}</td>
                      <td className="py-2 pr-3 text-gray-600">{e.source_tenant?.name || '—'}</td>
                      <td className="py-2 pr-3 text-gray-600">
                        {e.completed_at ? new Date(e.completed_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Transferred credits */}
          <Section title="Transferred Credits (Approved)" count={totalTransferred}>
            {data.transferred_credits.length === 0 ? (
              <EmptyRow text="No transferred credits on record." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3">Course</th>
                    <th className="py-2 pr-3">From</th>
                    <th className="py-2 pr-3">Grade</th>
                    <th className="py-2 pr-3">Credits</th>
                    <th className="py-2 pr-3">Equivalent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transferred_credits.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 text-gray-900">
                        {r.course_title}
                        {r.course_code ? <span className="text-gray-400 ml-1">({r.course_code})</span> : null}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{r.issuing_institution_name}</td>
                      <td className="py-2 pr-3 text-gray-600">{r.grade || '—'}</td>
                      <td className="py-2 pr-3 text-gray-900 font-medium">
                        {Number(r.awarded_credits ?? r.credits).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{r.equivalent_course?.title || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {title}
        <span className="ml-2 text-gray-400 font-normal">({count})</span>
      </h3>
      {children}
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 print:bg-transparent print:border print:border-gray-200">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 italic py-2">{text}</p>;
}
