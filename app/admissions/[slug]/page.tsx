'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

interface FormField {
  id: string;
  type: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  order: number;
  required: boolean;
  options: Record<string, unknown>;
  section: string | null;
}

interface FormData {
  form: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    settings: Record<string, unknown>;
  };
  fields: FormField[];
}

type PageState = 'loading' | 'form' | 'error' | 'success';

export default function PublicApplicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [state, setState] = useState<PageState>('loading');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  // Applicant info
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');

  // Answers keyed by field ID
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // File uploads - track uploaded doc IDs per field
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { id: string; name: string }>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // Sections for multi-step
  const [currentSection, setCurrentSection] = useState(0);
  const sections = formData ? getSections(formData.fields) : [];
  const isMultiStep = sections.length > 1;

  // Temp application ID for file uploads (created lazily)
  const tempAppIdRef = useRef<string | null>(null);

  function getSections(fields: FormField[]): string[] {
    const secs: string[] = [];
    for (const f of fields) {
      const sec = f.section || 'Application';
      if (!secs.includes(sec)) secs.push(sec);
    }
    return secs;
  }

  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/admissions/public/${slug}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'This form is not available');
        setState('error');
        return;
      }
      const data: FormData = await res.json();
      setFormData(data);
      setState('form');
    } catch {
      setError('Failed to load application form');
      setState('error');
    }
  }, [slug]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  const updateAnswer = (fieldId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleCheckboxToggle = (fieldId: string, choice: string) => {
    setAnswers(prev => {
      const current = (prev[fieldId] as string[]) || [];
      const updated = current.includes(choice)
        ? current.filter(c => c !== choice)
        : [...current, choice];
      return { ...prev, [fieldId]: updated };
    });
  };

  const handleFileUpload = async (fieldId: string, file: File) => {
    if (!formData) return;

    // Find field options for validation
    const field = formData.fields.find(f => f.id === fieldId);
    const maxSize = ((field?.options?.max_file_size_mb as number) || 10) * 1024 * 1024;
    if (file.size > maxSize) {
      setValidationErrors(prev => ({ ...prev, [fieldId]: `File too large (max ${(field?.options?.max_file_size_mb as number) || 10}MB)` }));
      return;
    }

    const allowedExt = (field?.options?.allowed_extensions as string) || '';
    if (allowedExt) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const allowed = allowedExt.split(',').map(e => e.trim().toLowerCase());
      if (!allowed.includes(ext)) {
        setValidationErrors(prev => ({ ...prev, [fieldId]: `File type not allowed. Allowed: ${allowedExt}` }));
        return;
      }
    }

    setUploading(prev => ({ ...prev, [fieldId]: true }));
    try {
      const fd = new window.FormData();
      fd.append('file', file);
      fd.append('application_id', tempAppIdRef.current || 'pending');
      fd.append('field_id', fieldId);

      const res = await fetch('/api/admissions/public/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setUploadedDocs(prev => ({ ...prev, [fieldId]: { id: data.document.id, name: file.name } }));
        updateAnswer(fieldId, data.document.id);
      } else {
        const err = await res.json();
        setValidationErrors(prev => ({ ...prev, [fieldId]: err.error || 'Upload failed' }));
      }
    } catch {
      setValidationErrors(prev => ({ ...prev, [fieldId]: 'Upload failed' }));
    } finally {
      setUploading(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const validate = (): boolean => {
    if (!formData) return false;
    const errors: Record<string, string> = {};

    if (!applicantName.trim()) errors._name = 'Full name is required';
    if (!applicantEmail.trim()) errors._email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail)) errors._email = 'Invalid email';

    for (const field of formData.fields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = `${field.label} is required`;
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !formData) return;

    setSubmitting(true);
    try {
      const answersArray = formData.fields.map(field => ({
        field_id: field.id,
        answer: answers[field.id] ?? null,
      }));

      const res = await fetch('/api/admissions/public/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          applicant_name: applicantName.trim(),
          applicant_email: applicantEmail.trim(),
          applicant_phone: applicantPhone.trim() || null,
          answers: answersArray,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAccessToken(data.access_token);
        setState('success');
      } else {
        setValidationErrors({ _form: data.error || 'Submission failed' });
      }
    } catch {
      setValidationErrors({ _form: 'Failed to submit. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render states ─────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingIndicator variant="pulse" text="Loading application form..." />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Form Not Available</h2>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (state === 'success') {
    const statusUrl = `${window.location.origin}/admissions/status?token=${accessToken}`;
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          {(formData?.form.settings?.confirmation_message as string) || 'Thank you for your application. We will review it and get back to you soon.'}
        </p>
        <p className="text-sm text-gray-500 mb-2">Your tracking token:</p>
        <code className="block bg-gray-100 text-gray-800 px-4 py-2 rounded text-sm font-mono mb-4 max-w-sm mx-auto break-all">
          {accessToken}
        </code>
        <p className="text-xs text-gray-400 mb-6">Save this token to check your application status.</p>
        <a
          href={statusUrl}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-oecs-navy-blue text-white text-sm font-medium rounded-none hover:opacity-90 transition"
        >
          Check Application Status
        </a>
      </div>
    );
  }

  if (!formData) return null;

  // Determine which fields to show based on current section
  const fieldsToShow = isMultiStep
    ? formData.fields.filter(f => (f.section || 'Application') === sections[currentSection])
    : formData.fields;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{formData.form.title}</h1>
      {formData.form.description && (
        <p className="text-sm text-gray-500 mb-6">{formData.form.description}</p>
      )}

      {/* Progress bar for multi-step */}
      {isMultiStep && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {sections.map((sec, i) => (
              <button
                key={sec}
                onClick={() => setCurrentSection(i)}
                className={`text-xs font-medium transition ${i === currentSection ? 'text-oecs-navy-blue' : i < currentSection ? 'text-emerald-600' : 'text-gray-400'}`}
              >
                {sec}
              </button>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-oecs-navy-blue h-1.5 rounded-full transition-all"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {validationErrors._form && (
        <div className="bg-red-50 border border-red-200 rounded-none p-3 mb-4">
          <p className="text-sm text-red-700">{validationErrors._form}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Applicant info (show on first section or single page) */}
        {(!isMultiStep || currentSection === 0) && (
          <div className="bg-white border border-gray-200 rounded-none p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Personal Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={e => { setApplicantName(e.target.value); setValidationErrors(prev => { const n = { ...prev }; delete n._name; return n; }); }}
                  className={`w-full px-3 py-2 text-sm border rounded-none ${validationErrors._name ? 'border-red-300' : 'border-gray-200'}`}
                />
                {validationErrors._name && <p className="text-xs text-red-500 mt-1">{validationErrors._name}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={applicantEmail}
                    onChange={e => { setApplicantEmail(e.target.value); setValidationErrors(prev => { const n = { ...prev }; delete n._email; return n; }); }}
                    className={`w-full px-3 py-2 text-sm border rounded-none ${validationErrors._email ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {validationErrors._email && <p className="text-xs text-red-500 mt-1">{validationErrors._email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={applicantPhone}
                    onChange={e => setApplicantPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {fieldsToShow.map(field => (
            <div key={field.id} className="bg-white border border-gray-200 rounded-none p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.description && (
                <p className="text-xs text-gray-400 mb-2">{field.description}</p>
              )}

              {/* Text */}
              {field.type === 'text' && (
                <input
                  type="text"
                  value={(answers[field.id] as string) || ''}
                  onChange={e => updateAnswer(field.id, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className={`w-full px-3 py-2 text-sm border rounded-none ${validationErrors[field.id] ? 'border-red-300' : 'border-gray-200'}`}
                />
              )}

              {/* Essay */}
              {field.type === 'essay' && (
                <textarea
                  value={(answers[field.id] as string) || ''}
                  onChange={e => updateAnswer(field.id, e.target.value)}
                  placeholder={field.placeholder || ''}
                  rows={4}
                  className={`w-full px-3 py-2 text-sm border rounded-none resize-y ${validationErrors[field.id] ? 'border-red-300' : 'border-gray-200'}`}
                />
              )}

              {/* Email */}
              {field.type === 'email' && (
                <input
                  type="email"
                  value={(answers[field.id] as string) || ''}
                  onChange={e => updateAnswer(field.id, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className={`w-full px-3 py-2 text-sm border rounded-none ${validationErrors[field.id] ? 'border-red-300' : 'border-gray-200'}`}
                />
              )}

              {/* Phone */}
              {field.type === 'phone' && (
                <input
                  type="tel"
                  value={(answers[field.id] as string) || ''}
                  onChange={e => updateAnswer(field.id, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className={`w-full px-3 py-2 text-sm border rounded-none ${validationErrors[field.id] ? 'border-red-300' : 'border-gray-200'}`}
                />
              )}

              {/* Date */}
              {field.type === 'date' && (
                <input
                  type="date"
                  value={(answers[field.id] as string) || ''}
                  onChange={e => updateAnswer(field.id, e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-none ${validationErrors[field.id] ? 'border-red-300' : 'border-gray-200'}`}
                />
              )}

              {/* Select / Dropdown */}
              {field.type === 'select' && (
                <select
                  value={(answers[field.id] as string) || ''}
                  onChange={e => updateAnswer(field.id, e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-none bg-white ${validationErrors[field.id] ? 'border-red-300' : 'border-gray-200'}`}
                >
                  <option value="">Select an option...</option>
                  {((field.options.choices as string[]) || []).map((choice, i) => (
                    <option key={i} value={choice}>{choice}</option>
                  ))}
                </select>
              )}

              {/* Multiple Choice (radio) */}
              {field.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {((field.options.choices as string[]) || []).map((choice, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`field-${field.id}`}
                        value={choice}
                        checked={(answers[field.id] as string) === choice}
                        onChange={() => updateAnswer(field.id, choice)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{choice}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Multiple Select (checkboxes) */}
              {field.type === 'multiple_select' && (
                <div className="space-y-2">
                  {((field.options.choices as string[]) || []).map((choice, i) => {
                    const checked = ((answers[field.id] as string[]) || []).includes(choice);
                    return (
                      <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleCheckboxToggle(field.id, choice)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{choice}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* File Upload */}
              {field.type === 'file_upload' && (
                <div>
                  {uploadedDocs[field.id] ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-none">
                      <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-emerald-700 flex-1">{uploadedDocs[field.id].name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedDocs(prev => { const n = { ...prev }; delete n[field.id]; return n; });
                          updateAnswer(field.id, null);
                        }}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(field.id, file);
                        }}
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={uploading[field.id]}
                      />
                      {uploading[field.id] && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {field.options.allowed_extensions && (
                    <p className="text-xs text-gray-400 mt-1">Allowed: {field.options.allowed_extensions as string}</p>
                  )}
                </div>
              )}

              {/* Rating Scale */}
              {field.type === 'rating_scale' && (
                <div className="flex gap-2">
                  {Array.from({ length: (field.options.max_rating as number) || 5 }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => updateAnswer(field.id, num)}
                      className={`w-10 h-10 rounded-none border text-sm font-medium transition ${
                        (answers[field.id] as number) === num
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}

              {validationErrors[field.id] && (
                <p className="text-xs text-red-500 mt-1">{validationErrors[field.id]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Navigation / Submit */}
        <div className="flex items-center justify-between mt-6 pb-8">
          {isMultiStep && currentSection > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentSection(prev => prev - 1)}
              className="px-6 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-none hover:bg-gray-50 transition"
            >
              Previous
            </button>
          ) : (
            <div />
          )}

          {isMultiStep && currentSection < sections.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentSection(prev => prev + 1)}
              className="px-6 py-2.5 text-sm font-medium bg-oecs-navy-blue text-white rounded-none hover:opacity-90 transition"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 text-sm font-medium bg-oecs-navy-blue text-white rounded-none hover:opacity-90 disabled:opacity-50 transition"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
