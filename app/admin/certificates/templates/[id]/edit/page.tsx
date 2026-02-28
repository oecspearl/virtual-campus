'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, X, Loader2, Eye, Code } from 'lucide-react';
import Link from 'next/link';
import CertificatePreview from '@/app/components/CertificatePreview';
import TinyMCEEditor from '@/app/components/TinyMCEEditor';

interface Template {
  id: string;
  name: string;
  description?: string;
  template_html: string;
  background_image_url?: string;
  logo_url?: string;
  is_default: boolean;
  variables: string[];
}

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCodeView, setShowCodeView] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_html: '',
    background_image_url: '',
    logo_url: '',
    is_default: false
  });

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/certificates/templates/${templateId}`);
      const data = await res.json();
      
      if (res.ok && data.template) {
        setTemplate(data.template);
        setFormData({
          name: data.template.name,
          description: data.template.description || '',
          template_html: data.template.template_html,
          background_image_url: data.template.background_image_url || '',
          logo_url: data.template.logo_url || '',
          is_default: data.template.is_default || false
        });
      } else {
        alert(data.error || 'Template not found');
        router.push('/admin/certificates/templates');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      alert('Failed to load template');
      router.push('/admin/certificates/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/certificates/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/certificates/templates');
      } else {
        alert(data.error || 'Failed to update template');
        setSaving(false);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-oecs-red mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Template not found</p>
          <Link
            href="/admin/certificates/templates"
            className="text-oecs-red hover:underline"
          >
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Edit Certificate Template</h1>
            <Link
              href="/admin/certificates/templates"
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="h-6 w-6" />
            </Link>
          </div>
          <p className="text-gray-600">
            Update the certificate template design
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 relative">
          <div className="space-y-6 pb-24">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                placeholder="e.g., Standard Certificate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                rows={2}
                placeholder="Brief description of this template"
              />
            </div>

            {/* Template HTML */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Template HTML *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCodeView(!showCodeView)}
                  className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition"
                >
                  <Code className="h-4 w-4" />
                  {showCodeView ? 'Visual Editor' : 'Code View'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Use variables: <code className="bg-gray-100 px-1 rounded">{`{{student_name}}`}</code>, 
                <code className="bg-gray-100 px-1 rounded">{`{{course_name}}`}</code>, 
                <code className="bg-gray-100 px-1 rounded">{`{{completion_date}}`}</code>, etc.
              </p>
              {showCodeView ? (
                <textarea
                  required
                  value={formData.template_html}
                  onChange={(e) => setFormData({ ...formData, template_html: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent font-mono text-sm"
                  rows={15}
                  placeholder="<div>Your HTML template here...</div>"
                />
              ) : (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <TinyMCEEditor
                    value={formData.template_html}
                    onChange={(html) => setFormData({ ...formData, template_html: html })}
                    height={500}
                    placeholder="Enter your certificate template HTML here..."
                  />
                </div>
              )}
            </div>

            {/* URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Image URL
                </label>
                <input
                  type="url"
                  value={formData.background_image_url}
                  onChange={(e) => setFormData({ ...formData, background_image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oecs-red focus:border-transparent"
                  placeholder="https://example.com/bg.png"
                />
              </div>
            </div>

            {/* Default Template */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="h-4 w-4 text-oecs-red focus:ring-oecs-red border-gray-300 rounded"
              />
              <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                Set as default template
              </label>
            </div>

          </div>

          {/* Actions - Sticky Footer */}
          <div className="sticky bottom-0 left-0 right-0 bg-white pt-4 border-t -mx-8 -mb-8 px-8 pb-8 mt-8 shadow-lg z-10">
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-6 py-3 border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition font-semibold"
              >
                <Eye className="h-5 w-5" />
                Preview
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-oecs-red text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-semibold shadow-md hover:shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>
              <Link
                href="/admin/certificates/templates"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>

        {/* Template Variables Reference */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Available Template Variables</h3>
          <p className="text-sm text-blue-800 mb-2">
            Use these variables in your template HTML with double curly braces:
          </p>
          <div className="flex flex-wrap gap-2">
            {['student_name', 'course_name', 'completion_date', 'grade_percentage', 'verification_code', 'logo_url'].map((varName) => (
              <code key={varName} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {`{{${varName}}}`}
              </code>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-3">
            Example: <code className="bg-blue-100 px-1 rounded">{`<h1>{{student_name}}</h1>`}</code>
          </p>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <CertificatePreview
            templateHtml={formData.template_html}
            logoUrl={formData.logo_url}
            onClose={() => setShowPreview(false)}
          />
        )}
      </div>
    </div>
  );
}

