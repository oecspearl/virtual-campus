'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Eye } from 'lucide-react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import CertificatePreview from '@/app/components/certificate/CertificatePreview';
import TextEditor from '@/app/components/editor/TextEditor';

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_html: `<div style="text-align: center; padding: 60px; font-family: 'Times New Roman', serif;">
  <h1 style="font-size: 48px; margin-bottom: 20px; color: #1a1a1a;">Certificate of Completion</h1>
  <p style="font-size: 20px; margin-bottom: 40px; color: #666;">This is to certify that</p>
  <h2 style="font-size: 36px; margin-bottom: 40px; color: #1a1a1a; font-weight: bold;">{{student_name}}</h2>
  <p style="font-size: 18px; margin-bottom: 40px; color: #666;">
    has successfully completed the course
  </p>
  <h3 style="font-size: 28px; margin-bottom: 40px; color: #1a1a1a;">{{course_name}}</h3>
  <p style="font-size: 16px; margin-bottom: 60px; color: #666;">
    Issued on {{completion_date}}
  </p>
  <p style="font-size: 14px; color: #666;">Verification Code: {{verification_code}}</p>
</div>`,
    background_image_url: '',
    logo_url: '',
    is_default: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/certificates/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/certificates/templates');
      } else {
        alert(data.error || 'Failed to create template');
        setSaving(false);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">Create Certificate Template</h1>
            <Link
              href="/admin/certificates/templates"
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="h-6 w-6" />
            </Link>
          </div>
          <p className="text-gray-600">
            Design a custom certificate template using HTML and template variables
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template HTML *
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Use variables: <code className="bg-gray-100 px-1 rounded">{`{{student_name}}`}</code>,
                <code className="bg-gray-100 px-1 rounded">{`{{course_name}}`}</code>,
                <code className="bg-gray-100 px-1 rounded">{`{{completion_date}}`}</code>, etc.
                Use the editor&apos;s Source Code view (Edit menu) for raw HTML editing.
              </p>
              <TextEditor
                value={formData.template_html}
                onChange={(html) => setFormData({ ...formData, template_html: html })}
                height={500}
                placeholder="Design your certificate template here..."
                editorType="proseforge"
              />
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
              <Button type="submit" disabled={saving}>
                <Save className="h-5 w-5 mr-1.5" />
                {saving ? 'Saving...' : 'Save Template'}
              </Button>
              <Link href="/admin/certificates/templates">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
            </div>
          </div>
        </form>

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

