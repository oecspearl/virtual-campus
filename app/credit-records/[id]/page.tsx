'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import CommentThread from '@/app/components/credit-records/CommentThread';

interface Record {
  id: string;
  source_type: 'in_network' | 'external';
  issuing_institution_name: string;
  issuing_tenant: { id: string; name: string; slug: string } | null;
  course_title: string;
  course_code: string | null;
  credits: number;
  awarded_credits: number | null;
  grade: string | null;
  grade_scale: string | null;
  completion_date: string | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
  evidence_url: string | null;
  equivalence_notes: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  student_id: string;
  student: { id: string; name: string; email: string } | null;
  equivalent_course: { id: string; title: string } | null;
  reviewer: { id: string; name: string } | null;
}

interface Viewer {
  role: string;
  is_registrar: boolean;
  is_owner: boolean;
}

const STATUS_BADGE: { [k: string]: string } = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  withdrawn: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function CreditRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<Record | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/credit-records/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRecord(data.record);
      setViewer(data.viewer);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleWithdraw = async () => {
    if (!record) return;
    if (!confirm('Withdraw this credit submission?')) return;
    const res = await fetch(`/api/credit-records/${record.id}`, { method: 'DELETE' });
    if (res.ok) load();
    else alert('Failed to withdraw');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-8">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-40 bg-white rounded-lg border border-gray-200 animate-pulse" />
          <div className="h-64 bg-white rounded-lg border border-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !record || !viewer) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Record not found'}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const backHref = viewer.is_registrar ? '/admin/credit-records' : '/credit-records';

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={backHref}
            className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
          >
            <Icon icon="mdi:arrow-left" className="w-4 h-4" />
            {viewer.is_registrar ? 'Back to review queue' : 'Back to my records'}
          </Link>
          {viewer.is_registrar && record.student?.id && (
            <Link
              href={`/transcript?student_id=${record.student.id}`}
              target="_blank"
              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <Icon icon="mdi:file-document-outline" className="w-4 h-4" />
              View student transcript
            </Link>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h1 className="text-lg font-display text-gray-900">
                {record.course_title}
                {record.course_code && (
                  <span className="text-gray-400 font-normal ml-2">({record.course_code})</span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                from {record.issuing_institution_name}
                {record.source_type === 'external' && (
                  <span className="ml-1 text-xs text-gray-400">(external)</span>
                )}
              </p>
            </div>
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full border capitalize shrink-0 ${STATUS_BADGE[record.status] || ''}`}
            >
              {record.status.replace('_', ' ')}
            </span>
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <DetailPair label="Student" value={record.student?.name || '—'} />
            <DetailPair
              label="Credits submitted"
              value={Number(record.credits).toFixed(2)}
            />
            {record.status === 'approved' && (
              <DetailPair
                label="Credits awarded"
                value={
                  record.awarded_credits !== null
                    ? Number(record.awarded_credits).toFixed(2)
                    : '—'
                }
                valueClass="text-green-700 font-medium"
              />
            )}
            <DetailPair label="Grade" value={record.grade || '—'} hint={record.grade_scale || undefined} />
            <DetailPair
              label="Completion"
              value={
                record.completion_date
                  ? new Date(record.completion_date).toLocaleDateString()
                  : '—'
              }
            />
            <DetailPair
              label="Submitted"
              value={new Date(record.created_at).toLocaleDateString()}
            />
            {record.reviewed_at && (
              <DetailPair
                label="Last reviewed"
                value={new Date(record.reviewed_at).toLocaleDateString()}
                hint={record.reviewer?.name || undefined}
              />
            )}
            {record.equivalent_course && (
              <DetailPair
                label="Local equivalent"
                value={record.equivalent_course.title}
              />
            )}
          </dl>

          {record.evidence_url && (
            <p className="mt-4 text-sm">
              <span className="text-gray-500">Evidence: </span>
              <a
                href={record.evidence_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open document
              </a>
            </p>
          )}

          {record.equivalence_notes && (
            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
              <span className="font-medium">Equivalence: </span>
              {record.equivalence_notes}
            </div>
          )}

          {record.review_notes && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm border ${
                record.status === 'rejected'
                  ? 'bg-red-50 border-red-100 text-red-800'
                  : 'bg-blue-50 border-blue-100 text-blue-800'
              }`}
            >
              <span className="font-medium">Review notes: </span>
              {record.review_notes}
            </div>
          )}

          {viewer.is_owner && ['pending', 'under_review'].includes(record.status) && (
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleWithdraw}>
                <Icon icon="mdi:close" className="w-4 h-4 mr-1.5" />
                Withdraw submission
              </Button>
            </div>
          )}
        </div>

        <CommentThread recordId={record.id} />
      </div>
    </div>
  );
}

function DetailPair({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`mt-0.5 text-gray-900 ${valueClass || ''}`}>
        {value}
        {hint && <span className="text-gray-400 text-xs ml-1">({hint})</span>}
      </dd>
    </div>
  );
}
