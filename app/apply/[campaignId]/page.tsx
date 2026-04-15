'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';

interface FormField {
  id: string;
  field_type: string;
  label: string;
  description: string | null;
  is_required: boolean;
  options: Array<{ id: string; text: string }> | null;
  display_order: number;
}

interface ApplicationFormData {
  programme_id: string;
  programme_title: string;
  programme_description: string | null;
  programme_thumbnail: string | null;
  campaign_name: string;
  recipient_name: string;
  already_applied: boolean;
  fields: FormField[];
}

export default function PublicApplicationFormPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ApplicationFormData | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFormData();
  }, [token]);

  const fetchFormData = async () => {
    if (!token) {
      setError('Invalid application link. No token was provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/applications/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('This application link is invalid or has expired.');
        } else if (res.status === 410) {
          setError('This application campaign is no longer accepting responses.');
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to load application form.');
        }
        setLoading(false);
        return;
      }
      const data: ApplicationFormData = await res.json();
      setFormData(data);

      const initialAnswers: Record<string, any> = {};
      data.fields.forEach((field) => {
        if (field.field_type === 'multiple_select') {
          initialAnswers[field.id] = [];
        } else {
          initialAnswers[field.id] = '';
        }
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error('Application form load error:', err);
      setError('Something went wrong loading the application form. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (fieldId: string, optionId: string) => {
    setAnswers((prev) => {
      const current: string[] = prev[fieldId] || [];
      const updated = current.includes(optionId)
        ? current.filter((id: string) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [fieldId]: updated };
    });
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;
    const errors: Record<string, string> = {};

    formData.fields.forEach((field) => {
      if (field.is_required) {
        const answer = answers[field.id];
        if (field.field_type === 'multiple_select') {
          if (!answer || (Array.isArray(answer) && answer.length === 0)) {
            errors[field.id] = 'This field is required';
          }
        } else if (!answer || (typeof answer === 'string' && answer.trim() === '')) {
          errors[field.id] = 'This field is required';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        token,
        answers: Object.entries(answers).map(([field_id, answer]) => ({
          field_id,
          answer,
        })),
      };

      const res = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit application. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Application submit error:', err);
      setError('Something went wrong submitting your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const hasError = !!validationErrors[field.id];

    return (
      <div key={field.id} className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {field.label}
          {field.is_required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.description && (
          <p className="text-xs text-gray-400">{field.description}</p>
        )}

        {field.field_type === 'text' && (
          <input
            type="text"
            value={answers[field.id] || ''}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-md text-sm text-gray-900 bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
              hasError ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
            }`}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        )}

        {field.field_type === 'essay' && (
          <textarea
            rows={4}
            value={answers[field.id] || ''}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-md text-sm text-gray-900 bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y ${
              hasError ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
            }`}
            placeholder={`Enter your response`}
          />
        )}

        {field.field_type === 'multiple_choice' && field.options && (
          <div className="space-y-2">
            {field.options.map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 px-4 py-3 border rounded-md cursor-pointer transition-all duration-200 ${
                  answers[field.id] === option.id
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20'
                    : hasError
                    ? 'border-red-200 hover:border-red-300'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={option.id}
                  checked={answers[field.id] === option.id}
                  onChange={() => updateAnswer(field.id, option.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {field.field_type === 'multiple_select' && field.options && (
          <div className="space-y-2">
            {field.options.map((option) => {
              const checked = (answers[field.id] || []).includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-md cursor-pointer transition-all duration-200 ${
                    checked
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20'
                      : hasError
                      ? 'border-red-200 hover:border-red-300'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleCheckboxToggle(field.id, option.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.text}</span>
                </label>
              );
            })}
          </div>
        )}

        {field.field_type === 'rating_scale' && field.options && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {field.options[0]?.text || 'Min'}
            </span>
            <input
              type="number"
              min={Number(field.options[0]?.id) || 1}
              max={Number(field.options[1]?.id) || 10}
              value={answers[field.id] || ''}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
              className={`w-24 px-4 py-2.5 border rounded-md text-sm text-gray-900 bg-white text-center transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                hasError ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
              }`}
              placeholder="-"
            />
            <span className="text-xs text-gray-400">
              {field.options[1]?.text || 'Max'}
            </span>
          </div>
        )}

        {hasError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />
            {validationErrors[field.id]}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse mx-auto" />
          </div>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 space-y-6">
            <div className="h-8 w-3/4 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-100 rounded-lg animate-pulse" />
            <div className="border-t border-gray-100 pt-6 space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-11 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Application</h1>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  if (formData.already_applied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Icon icon="mdi:information-outline" className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Already Submitted</h1>
            <p className="text-sm text-gray-500">
              You have already submitted your application for this programme. No further action is needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Icon icon="mdi:check-circle" className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Application Submitted</h1>
            <p className="text-sm text-gray-500">
              Thank you, {formData.recipient_name}! Your application for{' '}
              <span className="font-medium text-gray-700">{formData.programme_title}</span>{' '}
              has been successfully submitted. You will be notified about the outcome.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sortedFields = [...formData.fields].sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Programme Application
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          {formData.programme_thumbnail && (
            <div className="w-full h-48 bg-gray-100 overflow-hidden">
              <img
                src={formData.programme_thumbnail}
                alt={formData.programme_title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {formData.programme_title}
            </h1>
            {formData.programme_description && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {formData.programme_description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <Icon icon="mdi:account-outline" className="w-4 h-4" />
              <span>Applying as: <span className="font-medium text-gray-600">{formData.recipient_name}</span></span>
            </div>
          </div>

          {error && (
            <div className="mx-8 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-8 pb-8">
            <div className="border-t border-gray-100 pt-6 space-y-6">
              {sortedFields.map((field) => renderField(field))}
            </div>

            {Object.keys(validationErrors).length > 0 && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Please fill in all required fields before submitting.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Icon icon="mdi:send" className="w-4 h-4" />
                  Submit Application
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Powered by OECS Learning Platform
        </p>
      </div>
    </div>
  );
}
