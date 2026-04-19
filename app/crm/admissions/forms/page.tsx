'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface AdmissionForm {
  id: string;
  title: string;
  slug: string;
  status: string;
  programme_title: string | null;
  application_count: number;
  created_at: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  options: Record<string, unknown>;
  section: string;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', color: 'bg-emerald-50 text-emerald-700' },
  closed: { label: 'Closed', color: 'bg-red-50 text-red-700' },
};

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: 'mdi:form-textbox' },
  { value: 'essay', label: 'Long Text / Essay', icon: 'mdi:text-long' },
  { value: 'email', label: 'Email', icon: 'mdi:email-outline' },
  { value: 'phone', label: 'Phone', icon: 'mdi:phone-outline' },
  { value: 'date', label: 'Date', icon: 'mdi:calendar' },
  { value: 'select', label: 'Dropdown', icon: 'mdi:form-dropdown' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: 'mdi:radiobox-marked' },
  { value: 'multiple_select', label: 'Checkboxes', icon: 'mdi:checkbox-marked-outline' },
  { value: 'file_upload', label: 'File Upload', icon: 'mdi:file-upload-outline' },
  { value: 'rating_scale', label: 'Rating Scale', icon: 'mdi:star-outline' },
];

let tempIdCounter = 0;
function tempId() { return `temp_${++tempIdCounter}_${Date.now()}`; }

export default function FormsListPage() {
  const { showToast } = useToast();
  const [forms, setForms] = useState<AdmissionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Form builder modal state
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingFormStatus, setEditingFormStatus] = useState('draft');
  const [applicationCount, setApplicationCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form metadata
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [programmes, setProgrammes] = useState<Array<{ id: string; title: string }>>([]);

  // Fields
  const [fields, setFields] = useState<FormField[]>([]);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

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

  useEffect(() => {
    fetch('/api/programmes')
      .then(r => r.json())
      .then(data => setProgrammes(data.programmes || data || []))
      .catch(() => {});
  }, []);

  // Auto-generate slug from title (only for new forms)
  useEffect(() => {
    if (editingFormId) return;
    const generated = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
    setSlug(generated);
  }, [title, editingFormId]);

  const handlePublishToggle = async (formId: string) => {
    try {
      const res = await fetch(`/api/admissions/forms/${formId}/publish`, { method: 'POST' });
      if (res.ok) { showToast('Form status updated', 'success'); fetchForms(); }
    } catch {
      showToast('Failed to toggle publish', 'error');
    }
  };

  const handleDelete = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;
    try {
      const res = await fetch(`/api/admissions/forms/${formId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Form deleted', 'success'); fetchForms(); }
      else {
        const data = await res.json();
        showToast(data.error || 'Delete failed', 'error');
      }
    } catch {
      showToast('Failed to delete form', 'error');
    }
  };

  const copyUrl = (formSlug: string) => {
    const url = `${window.location.origin}/admissions/${formSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(formSlug);
    setTimeout(() => setCopied(null), 2000);
  };

  // Form builder functions
  const resetFormBuilder = () => {
    setEditingFormId(null);
    setEditingFormStatus('draft');
    setApplicationCount(0);
    setTitle('');
    setSlug('');
    setDescription('');
    setProgrammeId('');
    setDeadline('');
    setConfirmationMessage('');
    setFields([]);
    setShowTypeSelector(false);
  };

  const openCreateForm = () => {
    resetFormBuilder();
    setShowFormBuilder(true);
  };

  const openEditForm = async (formId: string) => {
    resetFormBuilder();
    setEditingFormId(formId);
    setFormLoading(true);
    setShowFormBuilder(true);

    try {
      const res = await fetch(`/api/admissions/forms/${formId}`);
      if (!res.ok) { showToast('Failed to load form', 'error'); setShowFormBuilder(false); return; }
      const data = await res.json();
      const form = data.form;

      setTitle(form.title || '');
      setSlug(form.slug || '');
      setDescription(form.description || '');
      setProgrammeId(form.programme_id || '');
      setEditingFormStatus(form.status || 'draft');
      setDeadline(form.settings?.deadline || '');
      setConfirmationMessage(form.settings?.confirmation_message || '');
      setApplicationCount(data.application_count || 0);

      setFields((data.fields || []).map((f: Record<string, unknown>) => ({
        id: f.id as string,
        type: f.type as string,
        label: (f.label as string) || '',
        description: (f.description as string) || '',
        placeholder: (f.placeholder as string) || '',
        required: (f.required as boolean) || false,
        options: (f.options as Record<string, unknown>) || {},
        section: (f.section as string) || '',
      })));
    } catch {
      showToast('Failed to load form', 'error');
      setShowFormBuilder(false);
    } finally {
      setFormLoading(false);
    }
  };

  const closeFormBuilder = () => {
    setShowFormBuilder(false);
    resetFormBuilder();
  };

  const addField = (type: string) => {
    setFields(prev => [...prev, {
      id: tempId(), type, label: '', description: '', placeholder: '',
      required: false, options: type === 'rating_scale' ? { max_rating: 5 } : {}, section: '',
    }]);
    setShowTypeSelector(false);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const moveField = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= fields.length) return;
    setFields(prev => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const addChoice = (fieldIndex: number) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== fieldIndex) return f;
      const choices = ((f.options.choices as string[]) || []);
      return { ...f, options: { ...f.options, choices: [...choices, ''] } };
    }));
  };

  const updateChoice = (fieldIndex: number, choiceIndex: number, value: string) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== fieldIndex) return f;
      const choices = [...((f.options.choices as string[]) || [])];
      choices[choiceIndex] = value;
      return { ...f, options: { ...f.options, choices } };
    }));
  };

  const removeChoice = (fieldIndex: number, choiceIndex: number) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== fieldIndex) return f;
      const choices = ((f.options.choices as string[]) || []).filter((_, ci) => ci !== choiceIndex);
      return { ...f, options: { ...f.options, choices } };
    }));
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    if (publish && fields.length === 0) { showToast('Add at least one field before publishing', 'error'); return; }

    for (const f of fields) {
      if (!f.label.trim()) { showToast('All fields must have a label', 'error'); return; }
      if (['select', 'multiple_choice', 'multiple_select'].includes(f.type)) {
        const choices = (f.options.choices as string[]) || [];
        if (choices.filter(c => c.trim()).length < 2) {
          showToast(`Field "${f.label}" needs at least 2 choices`, 'error'); return;
        }
      }
    }

    setSaving(true);
    try {
      const settings: Record<string, unknown> = {};
      if (deadline) settings.deadline = deadline;
      if (confirmationMessage) settings.confirmation_message = confirmationMessage;

      const fieldsPayload = fields.map((f, i) => ({
        type: f.type, label: f.label.trim(), description: f.description.trim() || null,
        placeholder: f.placeholder.trim() || null, order: i, required: f.required,
        options: f.options, section: f.section.trim() || null,
      }));

      if (editingFormId) {
        await fetch(`/api/admissions/forms/${editingFormId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), slug: slug.trim(),
            description: description.trim() || null, programme_id: programmeId || null, settings,
          }),
        });
        await fetch(`/api/admissions/forms/${editingFormId}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: fieldsPayload }),
        });
        showToast('Form updated', 'success');
      } else {
        const formRes = await fetch('/api/admissions/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), slug: slug.trim(),
            description: description.trim() || null, programme_id: programmeId || null, settings,
          }),
        });
        if (!formRes.ok) {
          const err = await formRes.json();
          showToast(err.error || 'Failed to create form', 'error'); return;
        }
        const { form } = await formRes.json();

        if (fields.length > 0) {
          await fetch(`/api/admissions/forms/${form.id}/fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: fieldsPayload }),
          });
        }

        if (publish) {
          await fetch(`/api/admissions/forms/${form.id}/publish`, { method: 'POST' });
        }
        showToast(publish ? 'Form created and published' : 'Form created as draft', 'success');
      }

      closeFormBuilder();
      fetchForms();
    } catch {
      showToast('Failed to save form', 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasChoices = (type: string) => ['select', 'multiple_choice', 'multiple_select'].includes(type);
  const fieldTypeInfo = (type: string) => FIELD_TYPES.find(t => t.value === type);

  return (
    <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/crm/admissions" className="text-gray-400 hover:text-gray-600 transition-colors">
              <Icon icon="mdi:arrow-left" className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Application Forms</h1>
              <p className="text-sm text-gray-500 mt-1">Create and manage admission forms</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            Create New Form
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="flex-1 h-4 bg-gray-200 rounded-lg" />
                  <div className="w-20 h-4 bg-gray-200 rounded-lg" />
                  <div className="w-32 h-4 bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : forms.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Icon icon="mdi:file-document-plus-outline" className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600 font-medium mb-3">No forms created yet</p>
              <button
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"
              >
                <Icon icon="mdi:plus" className="w-4 h-4" />
                Create Your First Form
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Programme</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applications</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Public URL</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="w-32 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forms.map(form => {
                  const badge = STATUS_BADGE[form.status] || STATUS_BADGE.draft;
                  return (
                    <tr key={form.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{form.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${badge.color}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{form.programme_title || '\u2014'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{form.application_count}</td>
                      <td className="px-4 py-3">
                        {form.status === 'published' ? (
                          <button
                            onClick={() => copyUrl(form.slug)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-900"
                          >
                            <Icon icon={copied === form.slug ? 'mdi:check' : 'mdi:content-copy'} className="w-3.5 h-3.5" />
                            {copied === form.slug ? 'Copied!' : `/admissions/${form.slug}`}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Not published</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(form.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(form.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Icon icon="mdi:pencil" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePublishToggle(form.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title={form.status === 'draft' ? 'Publish' : form.status === 'published' ? 'Close' : 'Reopen as Draft'}
                          >
                            <Icon icon={form.status === 'published' ? 'mdi:eye-off' : 'mdi:eye'} className="w-4 h-4" />
                          </button>
                          {form.status !== 'published' && form.application_count === 0 && (
                            <button
                              onClick={() => handleDelete(form.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            </div>
          )}
        </div>

      {/* Form Builder Modal */}
      {showFormBuilder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={closeFormBuilder}>
          <div className="bg-white rounded-lg border border-gray-100 w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
            {formLoading ? (
              <div className="p-8 space-y-4">
                <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-60 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-gray-900">
                      {editingFormId ? 'Edit Form' : 'Create Application Form'}
                    </h2>
                    {editingFormId && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Status: <strong>{editingFormStatus}</strong>
                        {applicationCount > 0 && ` \u2022 ${applicationCount} application${applicationCount !== 1 ? 's' : ''}`}
                      </p>
                    )}
                  </div>
                  <button onClick={closeFormBuilder} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon icon="mdi:close" className="w-5 h-5" />
                  </button>
                </div>

                {/* Warning if editing form with applications */}
                {editingFormId && applicationCount > 0 && (
                  <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <Icon icon="mdi:alert-outline" className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">This form has {applicationCount} application{applicationCount !== 1 ? 's' : ''}. Changing fields may affect how existing answers are displayed.</p>
                  </div>
                )}

                <div className="p-6 space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {/* Form Metadata */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Form Details</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                          <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. 2026 BSc Computer Science Application"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">URL Slug</label>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-400 mr-1">/admissions/</span>
                            <input
                              type="text"
                              value={slug}
                              onChange={e => setSlug(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <textarea
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          rows={2}
                          placeholder="Brief description shown to applicants..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 resize-none transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Programme (optional)</label>
                          <select
                            value={programmeId}
                            onChange={e => setProgrammeId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                          >
                            <option value="">No programme linked</option>
                            {programmes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Deadline (optional)</label>
                          <input
                            type="datetime-local"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Confirmation Message (optional)</label>
                        <textarea
                          value={confirmationMessage}
                          onChange={e => setConfirmationMessage(e.target.value)}
                          rows={2}
                          placeholder="Custom message shown after submission..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 resize-none transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fields */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">Form Fields</h3>
                      <span className="text-xs text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
                    </div>

                    {fields.length === 0 && (
                      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center mb-3">
                        <Icon icon="mdi:form-textbox" className="w-6 h-6 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No fields yet. Add your first field below.</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {fields.map((field, index) => {
                        const typeInfo = fieldTypeInfo(field.type);
                        return (
                          <div key={field.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col gap-0.5 pt-1">
                                <button onClick={() => moveField(index, -1)} disabled={index === 0} className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30">
                                  <Icon icon="mdi:chevron-up" className="w-4 h-4" />
                                </button>
                                <button onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30">
                                  <Icon icon="mdi:chevron-down" className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Icon icon={typeInfo?.icon || 'mdi:form-textbox'} className="w-4 h-4 text-gray-400" />
                                  <span className="text-xs text-gray-400 font-medium">{typeInfo?.label || field.type}</span>
                                  <div className="flex-1" />
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={field.required} onChange={e => updateField(index, { required: e.target.checked })} className="rounded text-blue-600" />
                                    <span className="text-xs text-gray-500">Required</span>
                                  </label>
                                  <button onClick={() => removeField(index)} className="p-1 text-gray-300 hover:text-red-500">
                                    <Icon icon="mdi:close" className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">Label *</label>
                                    <input type="text" value={field.label} onChange={e => updateField(index, { label: e.target.value })} placeholder="e.g. Full Name" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white" />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
                                    <input type="text" value={field.placeholder} onChange={e => updateField(index, { placeholder: e.target.value })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white" />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Description</label>
                                  <input type="text" value={field.description} onChange={e => updateField(index, { description: e.target.value })} placeholder="Help text..." className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white" />
                                </div>

                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Section (optional)</label>
                                  <input type="text" value={field.section} onChange={e => updateField(index, { section: e.target.value })} placeholder="e.g. Personal Information" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white" />
                                </div>

                                {hasChoices(field.type) && (
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">Choices</label>
                                    <div className="space-y-1.5">
                                      {((field.options.choices as string[]) || []).map((choice, ci) => (
                                        <div key={ci} className="flex items-center gap-2">
                                          <input type="text" value={choice} onChange={e => updateChoice(index, ci, e.target.value)} placeholder={`Choice ${ci + 1}`} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white" />
                                          <button onClick={() => removeChoice(index, ci)} className="p-1 text-gray-300 hover:text-red-500">
                                            <Icon icon="mdi:close" className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button onClick={() => addChoice(index)} className="mt-2 text-xs text-blue-600 hover:text-blue-900 font-medium">+ Add Choice</button>
                                  </div>
                                )}

                                {field.type === 'rating_scale' && (
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">Max Rating</label>
                                    <input type="number" min={2} max={10} value={(field.options.max_rating as number) || 5} onChange={e => updateField(index, { options: { ...field.options, max_rating: parseInt(e.target.value) || 5 } })} className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white" />
                                  </div>
                                )}

                                {field.type === 'file_upload' && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Max File Size (MB)</label>
                                      <input type="number" min={1} max={10} value={(field.options.max_file_size_mb as number) || 10} onChange={e => updateField(index, { options: { ...field.options, max_file_size_mb: parseInt(e.target.value) || 10 } })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Allowed Extensions</label>
                                      <input type="text" value={(field.options.allowed_extensions as string) || ''} onChange={e => updateField(index, { options: { ...field.options, allowed_extensions: e.target.value } })} placeholder="pdf,doc,jpg" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Field */}
                    <div className="mt-3">
                      {showTypeSelector ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-xs font-medium text-gray-500 mb-3">Select field type:</p>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {FIELD_TYPES.map(type => (
                              <button
                                key={type.value}
                                onClick={() => addField(type.value)}
                                className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-300 transition text-center"
                              >
                                <Icon icon={type.icon} className="w-5 h-5 text-gray-500" />
                                <span className="text-xs font-medium text-gray-700">{type.label}</span>
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setShowTypeSelector(false)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowTypeSelector(true)}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition"
                        >
                          <Icon icon="mdi:plus" className="w-4 h-4 inline mr-1" />
                          Add Field
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 p-6 border-t border-gray-100">
                  {editingFormId ? (
                    <button
                      onClick={() => handleSave(false)}
                      disabled={saving}
                      className="px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="px-6 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-300"
                      >
                        {saving ? 'Saving...' : 'Save as Draft'}
                      </button>
                      <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 shadow-sm hover:shadow-md"
                      >
                        {saving ? 'Saving...' : 'Save & Publish'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={closeFormBuilder}
                    className="px-6 py-2.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
