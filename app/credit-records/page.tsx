'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import AccessibleModal from '@/app/components/ui/AccessibleModal';

interface CreditRecord {
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
  equivalent_course: { id: string; title: string } | null;
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface EligibleEnrollment {
  id: string;
  completed_at: string | null;
  source_tenant: { id: string; name: string; slug: string } | null;
  course: {
    id: string;
    title: string;
    subject_area: string | null;
    estimated_duration: string | null;
  } | null;
  already_submitted: boolean;
  existing_status: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  withdrawn: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function CreditRecordsPage() {
  const [records, setRecords] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [eligible, setEligible] = useState<EligibleEnrollment[]>([]);
  const [sourceEnrollmentId, setSourceEnrollmentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    source_type: 'in_network' as 'in_network' | 'external',
    issuing_tenant_id: '',
    issuing_institution_name: '',
    course_title: '',
    course_code: '',
    credits: '',
    grade: '',
    grade_scale: '',
    completion_date: '',
    evidence_url: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/credit-records');
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = async () => {
    setShowForm(true);
    setSourceEnrollmentId('');
    try {
      const [tenantsRes, eligibleRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/credit-records/eligible-enrollments'),
      ]);
      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data.tenants || []);
      }
      if (eligibleRes.ok) {
        const data = await eligibleRes.json();
        setEligible(data.enrollments || []);
      }
    } catch {
      // non-super_admin students won't be able to list all tenants; form still works via manual name entry
    }
  };

  const prefillFromEnrollment = (enrollmentId: string) => {
    const e = eligible.find((x) => x.id === enrollmentId);
    if (!e || !e.course || !e.source_tenant) {
      setSourceEnrollmentId('');
      return;
    }
    setSourceEnrollmentId(enrollmentId);
    setForm({
      ...form,
      source_type: 'in_network',
      issuing_tenant_id: e.source_tenant.id,
      issuing_institution_name: e.source_tenant.name,
      course_title: e.course.title,
      course_code: '',
      completion_date: e.completed_at ? e.completed_at.slice(0, 10) : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        source_type: form.source_type,
        issuing_institution_name: form.issuing_institution_name,
        course_title: form.course_title,
        course_code: form.course_code || undefined,
        credits: Number(form.credits),
        grade: form.grade || undefined,
        grade_scale: form.grade_scale || undefined,
        completion_date: form.completion_date || undefined,
        evidence_url: form.evidence_url || undefined,
      };
      if (form.source_type === 'in_network') {
        payload.issuing_tenant_id = form.issuing_tenant_id || undefined;
      }
      if (sourceEnrollmentId) {
        payload.source_enrollment_id = sourceEnrollmentId;
      }
      const res = await fetch('/api/credit-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setSourceEnrollmentId('');
        setForm({
          source_type: 'in_network',
          issuing_tenant_id: '',
          issuing_institution_name: '',
          course_title: '',
          course_code: '',
          credits: '',
          grade: '',
          grade_scale: '',
          completion_date: '',
          evidence_url: '',
        });
        load();
      } else {
        alert(data.error || 'Failed to submit credit record');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit credit record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (id: string) => {
    if (!confirm('Withdraw this credit submission?')) return;
    const res = await fetch(`/api/credit-records/${id}`, { method: 'DELETE' });
    if (res.ok) load();
    else alert('Failed to withdraw');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-display text-gray-900 tracking-tight">Credit Transfer</h1>
            <p className="text-sm text-gray-500">
              Submit credits earned elsewhere for review by this institution&apos;s registrar
            </p>
          </div>
          <Button size="sm" onClick={openForm}>
            <Icon icon="mdi:plus" className="w-4 h-4 mr-1.5" />
            Submit Credit
          </Button>
        </div>

        <AccessibleModal isOpen={showForm} onClose={() => setShowForm(false)} title="Submit Credit for Transfer" size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {eligible.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <label className="block text-sm font-medium text-blue-900 mb-1">
                  <Icon icon="mdi:auto-fix" className="w-4 h-4 inline mr-1" />
                  Import from a completed regional course
                </label>
                <select
                  value={sourceEnrollmentId}
                  onChange={(e) => prefillFromEnrollment(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white"
                >
                  <option value="">— Fill in manually —</option>
                  {eligible.map((e) => (
                    <option key={e.id} value={e.id} disabled={e.already_submitted}>
                      {e.course?.title} — {e.source_tenant?.name}
                      {e.already_submitted ? ` (already ${e.existing_status})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-700 mt-1">
                  Selecting a course prefills the institution, title, and completion date.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.source_type === 'in_network'}
                    onChange={() => setForm({ ...form, source_type: 'in_network' })}
                  />
                  In-network institution
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.source_type === 'external'}
                    onChange={() => setForm({ ...form, source_type: 'external' })}
                  />
                  External institution
                </label>
              </div>
            </div>

            {form.source_type === 'in_network' && tenants.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuing institution *</label>
                <select
                  required
                  value={form.issuing_tenant_id}
                  onChange={(e) => {
                    const t = tenants.find((x) => x.id === e.target.value);
                    setForm({
                      ...form,
                      issuing_tenant_id: e.target.value,
                      issuing_institution_name: t?.name || '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select an institution</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution name *</label>
                <input
                  required
                  type="text"
                  value={form.issuing_institution_name}
                  onChange={(e) => setForm({ ...form, issuing_institution_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. University of the West Indies"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course title *</label>
                <input
                  required
                  type="text"
                  value={form.course_title}
                  onChange={(e) => setForm({ ...form, course_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course code</label>
                <input
                  type="text"
                  value={form.course_code}
                  onChange={(e) => setForm({ ...form, course_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. COMP1601"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
                <input
                  required
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                <input
                  type="text"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="A / 85%"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade scale</label>
                <input
                  type="text"
                  value={form.grade_scale}
                  onChange={(e) => setForm({ ...form, grade_scale: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. 4.0 GPA"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion date</label>
                <input
                  type="date"
                  value={form.completion_date}
                  onChange={(e) => setForm({ ...form, completion_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidence URL</label>
                <input
                  type="url"
                  value={form.evidence_url}
                  onChange={(e) => setForm({ ...form, evidence_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Link to transcript / certificate"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-200">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </AccessibleModal>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 animate-pulse h-40" />
        ) : records.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Icon icon="mdi:file-document-outline" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-1">No credit submissions yet</p>
            <p className="text-sm text-gray-500">
              Submit credits from another institution for review
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Institution</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.course_title}</p>
                      {r.course_code && <p className="text-xs text-gray-500">{r.course_code}</p>}
                      {r.status === 'approved' && r.equivalent_course && (
                        <p className="text-xs text-green-700 mt-0.5">
                          Mapped to {r.equivalent_course.title}
                        </p>
                      )}
                      {r.status === 'rejected' && r.review_notes && (
                        <p className="text-xs text-red-600 mt-0.5">{r.review_notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.issuing_institution_name}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {r.status === 'approved' && r.awarded_credits !== null
                        ? `${Number(r.awarded_credits).toFixed(2)} awarded`
                        : `${Number(r.credits).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full border capitalize ${STATUS_BADGE[r.status] || ''}`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/credit-records/${r.id}`}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Details
                        </Link>
                        {['pending', 'under_review'].includes(r.status) && (
                          <button
                            onClick={() => handleWithdraw(r.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
