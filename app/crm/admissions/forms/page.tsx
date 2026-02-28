'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface AdmissionForm {
  id: string;
  title: string;
  slug: string;
  status: string;
  programme_title: string | null;
  application_count: number;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', color: 'bg-emerald-50 text-emerald-700' },
  closed: { label: 'Closed', color: 'bg-red-50 text-red-700' },
};

export default function FormsListPage() {
  const [forms, setForms] = useState<AdmissionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/admissions/forms');
      const data = await res.json();
      setForms(data.forms || []);
    } catch {
      console.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handlePublishToggle = async (formId: string) => {
    try {
      const res = await fetch(`/api/admissions/forms/${formId}/publish`, { method: 'POST' });
      if (res.ok) fetchForms();
    } catch {
      console.error('Failed to toggle publish');
    }
  };

  const handleDelete = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;
    try {
      const res = await fetch(`/api/admissions/forms/${formId}`, { method: 'DELETE' });
      if (res.ok) fetchForms();
      else {
        const data = await res.json();
        alert(data.error || 'Delete failed');
      }
    } catch {
      console.error('Failed to delete form');
    }
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/admissions/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/crm/admissions" className="text-gray-400 hover:text-gray-600">
            <Icon icon="mdi:arrow-left" className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application Forms</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage admission forms</p>
          </div>
        </div>
        <Link
          href="/crm/admissions/forms/create"
          className="flex items-center gap-2 px-4 py-2.5 bg-oecs-navy-blue text-white text-sm font-medium rounded-none hover:opacity-90 transition"
        >
          <Icon icon="mdi:plus" className="w-4 h-4" />
          Create New Form
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="w-20 h-4 bg-gray-200 rounded" />
                <div className="w-32 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="p-12 text-center">
            <Icon icon="mdi:file-document-plus-outline" className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-3">No forms created yet</p>
            <Link
              href="/crm/admissions/forms/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-oecs-navy-blue text-white text-sm font-medium rounded-none"
            >
              <Icon icon="mdi:plus" className="w-4 h-4" />
              Create Your First Form
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Programme</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Applications</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Public URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                <th className="w-40 px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forms.map(form => {
                const badge = STATUS_BADGE[form.status] || STATUS_BADGE.draft;
                return (
                  <tr key={form.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{form.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-none ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{form.programme_title || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{form.application_count}</td>
                    <td className="px-4 py-3">
                      {form.status === 'published' ? (
                        <button
                          onClick={() => copyUrl(form.slug)}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Icon icon={copied === form.slug ? 'mdi:check' : 'mdi:content-copy'} className="w-3.5 h-3.5" />
                          {copied === form.slug ? 'Copied!' : `/admissions/${form.slug}`}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Not published</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(form.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/crm/admissions/forms/${form.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-none"
                          title="Edit"
                        >
                          <Icon icon="mdi:pencil" className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handlePublishToggle(form.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-none"
                          title={form.status === 'draft' ? 'Publish' : form.status === 'published' ? 'Close' : 'Reopen as Draft'}
                        >
                          <Icon
                            icon={form.status === 'published' ? 'mdi:eye-off' : 'mdi:eye'}
                            className="w-4 h-4"
                          />
                        </button>
                        {form.status !== 'published' && form.application_count === 0 && (
                          <button
                            onClick={() => handleDelete(form.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-none"
                            title="Delete"
                          >
                            <Icon icon="mdi:delete" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
