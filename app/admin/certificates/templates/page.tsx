'use client';

import { useEffect, useState } from 'react';
import { Edit, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import CertificatePreview from '@/app/components/certificate/CertificatePreview';

interface Template {
  id: string;
  name: string;
  description?: string;
  template_html: string;
  background_image_url?: string;
  logo_url?: string;
  is_default: boolean;
  variables: string[];
  created_at: string;
}

export default function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/certificates/templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`/api/admin/certificates/templates/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchTemplates();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oecs-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-2">Certificate Templates</h1>
            <p className="text-gray-600">
              Manage certificate templates for course completions
            </p>
          </div>
          <Link href="/admin/certificates/templates/new">
            <Button size="sm">
              <Icon icon="material-symbols:add" className="w-4 h-4 mr-1.5" />
              Create Template
            </Button>
          </Link>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No templates found</p>
            <Link href="/admin/certificates/templates/new">
              <Button size="sm">
                <Icon icon="material-symbols:add" className="w-4 h-4 mr-1.5" />
                Create Your First Template
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
              >
                {/* Template Header */}
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    {template.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        <CheckCircle2 className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                  )}
                </div>

                {/* Template Info */}
                <div className="p-6">
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-gray-500">
                      Variables: {template.variables.length > 0 ? template.variables.join(', ') : 'None'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="flex-1 px-3 py-2 border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition text-sm font-medium flex items-center justify-center gap-2"
                      title="Preview template"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    <Link
                      href={`/admin/certificates/templates/${template.id}/edit`}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-sm font-medium flex items-center justify-center gap-2"
                      title="Edit template"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={template.is_default}
                      className="px-3 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={template.is_default ? 'Cannot delete default template' : 'Delete template'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
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
        {previewTemplate && (
          <CertificatePreview
            templateHtml={previewTemplate.template_html}
            logoUrl={previewTemplate.logo_url}
            onClose={() => setPreviewTemplate(null)}
          />
        )}
      </div>
    </div>
  );
}

