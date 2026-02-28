'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';

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

export default function CreateFormPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

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

  // Auto-generate slug from title
  useEffect(() => {
    const generated = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
    setSlug(generated);
  }, [title]);

  // Fetch programmes
  useEffect(() => {
    fetch('/api/programmes')
      .then(r => r.json())
      .then(data => setProgrammes(data.programmes || data || []))
      .catch(() => {});
  }, []);

  const addField = (type: string) => {
    setFields(prev => [...prev, {
      id: tempId(),
      type,
      label: '',
      description: '',
      placeholder: '',
      required: false,
      options: type === 'rating_scale' ? { max_rating: 5 } : {},
      section: '',
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
    if (!title.trim()) { alert('Title is required'); return; }
    if (publish && fields.length === 0) { alert('Add at least one field before publishing'); return; }

    // Validate fields
    for (const f of fields) {
      if (!f.label.trim()) { alert('All fields must have a label'); return; }
      if (['select', 'multiple_choice', 'multiple_select'].includes(f.type)) {
        const choices = (f.options.choices as string[]) || [];
        if (choices.filter(c => c.trim()).length < 2) {
          alert(`Field "${f.label}" needs at least 2 choices`); return;
        }
      }
    }

    setSaving(true);
    try {
      // 1. Create form
      const settings: Record<string, unknown> = {};
      if (deadline) settings.deadline = deadline;
      if (confirmationMessage) settings.confirmation_message = confirmationMessage;

      const formRes = await fetch('/api/admissions/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          programme_id: programmeId || null,
          settings,
        }),
      });

      if (!formRes.ok) {
        const err = await formRes.json();
        alert(err.error || 'Failed to create form');
        return;
      }

      const { form } = await formRes.json();

      // 2. Save fields
      if (fields.length > 0) {
        const fieldsPayload = fields.map((f, i) => ({
          type: f.type,
          label: f.label.trim(),
          description: f.description.trim() || null,
          placeholder: f.placeholder.trim() || null,
          order: i,
          required: f.required,
          options: f.options,
          section: f.section.trim() || null,
        }));

        await fetch(`/api/admissions/forms/${form.id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: fieldsPayload }),
        });
      }

      // 3. Publish if requested
      if (publish) {
        await fetch(`/api/admissions/forms/${form.id}/publish`, { method: 'POST' });
      }

      router.push('/crm/admissions/forms');
    } catch {
      alert('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const hasChoices = (type: string) => ['select', 'multiple_choice', 'multiple_select'].includes(type);
  const fieldTypeInfo = (type: string) => FIELD_TYPES.find(t => t.value === type);

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/crm/admissions/forms" className="text-gray-400 hover:text-gray-600">
          <Icon icon="mdi:arrow-left" className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Application Form</h1>
          <p className="text-sm text-gray-500 mt-1">Design a form for prospective students</p>
        </div>
      </div>

      {/* Form Metadata */}
      <div className="bg-white border border-gray-200 rounded-none p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Form Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 2026 BSc Computer Science Application"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none"
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
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-none"
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
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Programme (optional)</label>
              <select
                value={programmeId}
                onChange={e => setProgrammeId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none bg-white"
              >
                <option value="">No programme linked</option>
                {programmes.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Deadline (optional)</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none"
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
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Form Fields</h2>
          <span className="text-xs text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
        </div>

        {fields.length === 0 && (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-none p-8 text-center mb-4">
            <Icon icon="mdi:form-textbox" className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No fields yet. Add your first field below.</p>
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => {
            const typeInfo = fieldTypeInfo(field.type);
            return (
              <div key={field.id} className="bg-white border border-gray-200 rounded-none p-4">
                <div className="flex items-start gap-3">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button
                      onClick={() => moveField(index, -1)}
                      disabled={index === 0}
                      className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                    >
                      <Icon icon="mdi:chevron-up" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveField(index, 1)}
                      disabled={index === fields.length - 1}
                      className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                    >
                      <Icon icon="mdi:chevron-down" className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Field config */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon={typeInfo?.icon || 'mdi:form-textbox'} className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-400 font-medium">{typeInfo?.label || field.type}</span>
                      <div className="flex-1" />
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => updateField(index, { required: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-xs text-gray-500">Required</span>
                      </label>
                      <button
                        onClick={() => removeField(index)}
                        className="p-1 text-gray-300 hover:text-red-500"
                      >
                        <Icon icon="mdi:close" className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Label *</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => updateField(index, { label: e.target.value })}
                          placeholder="e.g. Full Name"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
                        <input
                          type="text"
                          value={field.placeholder}
                          onChange={e => updateField(index, { placeholder: e.target.value })}
                          placeholder="Placeholder text..."
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Description</label>
                      <input
                        type="text"
                        value={field.description}
                        onChange={e => updateField(index, { description: e.target.value })}
                        placeholder="Help text for applicants..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Section (optional)</label>
                      <input
                        type="text"
                        value={field.section}
                        onChange={e => updateField(index, { section: e.target.value })}
                        placeholder="e.g. Personal Information"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-none"
                      />
                    </div>

                    {/* Choice-based options */}
                    {hasChoices(field.type) && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Choices</label>
                        <div className="space-y-1.5">
                          {((field.options.choices as string[]) || []).map((choice, ci) => (
                            <div key={ci} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={choice}
                                onChange={e => updateChoice(index, ci, e.target.value)}
                                placeholder={`Choice ${ci + 1}`}
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-none"
                              />
                              <button
                                onClick={() => removeChoice(index, ci)}
                                className="p-1 text-gray-300 hover:text-red-500"
                              >
                                <Icon icon="mdi:close" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => addChoice(index)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          + Add Choice
                        </button>
                      </div>
                    )}

                    {/* Rating scale options */}
                    {field.type === 'rating_scale' && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Max Rating</label>
                        <input
                          type="number"
                          min={2}
                          max={10}
                          value={(field.options.max_rating as number) || 5}
                          onChange={e => updateField(index, {
                            options: { ...field.options, max_rating: parseInt(e.target.value) || 5 }
                          })}
                          className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-none"
                        />
                      </div>
                    )}

                    {/* File upload options */}
                    {field.type === 'file_upload' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Max File Size (MB)</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={(field.options.max_file_size_mb as number) || 10}
                            onChange={e => updateField(index, {
                              options: { ...field.options, max_file_size_mb: parseInt(e.target.value) || 10 }
                            })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Allowed Extensions</label>
                          <input
                            type="text"
                            value={(field.options.allowed_extensions as string) || ''}
                            onChange={e => updateField(index, {
                              options: { ...field.options, allowed_extensions: e.target.value }
                            })}
                            placeholder="pdf,doc,jpg"
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Field Button */}
        <div className="mt-4">
          {showTypeSelector ? (
            <div className="bg-white border border-gray-200 rounded-none p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">Select field type:</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {FIELD_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => addField(type.value)}
                    className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-none hover:bg-blue-50 hover:border-blue-300 transition text-center"
                  >
                    <Icon icon={type.icon} className="w-5 h-5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">{type.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTypeSelector(false)}
                className="mt-3 text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTypeSelector(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-none text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition"
            >
              <Icon icon="mdi:plus" className="w-4 h-4 inline mr-1" />
              Add Field
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pb-8">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="px-6 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-none hover:bg-gray-50 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="px-6 py-2.5 text-sm font-medium bg-oecs-navy-blue text-white rounded-none hover:opacity-90 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : 'Save & Publish'}
        </button>
        <Link
          href="/crm/admissions/forms"
          className="px-6 py-2.5 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
