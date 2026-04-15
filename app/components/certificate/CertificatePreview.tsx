'use client';

import { useState } from 'react';
import { X, Download, Eye } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';

interface CertificatePreviewProps {
  templateHtml: string;
  logoUrl?: string;
  onClose: () => void;
}

export default function CertificatePreview({ templateHtml, logoUrl, onClose }: CertificatePreviewProps) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sample data for preview
  const sampleData = {
    student_name: 'John Doe',
    course_name: 'Sample Course Name',
    completion_date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    grade_percentage: '95',
    verification_code: 'PREVIEW-12345',
    logo_url: logoUrl || ''
  };

  // Replace template variables with sample data
  const replaceVariables = (html: string): string => {
    let result = html;
    Object.keys(sampleData).forEach(key => {
      const value = sampleData[key as keyof typeof sampleData];
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  };

  const handlePreviewPDF = async () => {
    setPreviewLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/certificates/templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_html: templateHtml,
          logo_url: logoUrl
        })
      });

      const data = await res.json();

      if (res.ok && data.preview) {
        // Create blob URL from base64
        const binaryString = atob(data.preview);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else {
        setError(data.error || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPreview = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = 'certificate-preview.pdf';
      link.click();
    }
  };

  // HTML Preview (rendered HTML with variables replaced)
  const htmlPreview = replaceVariables(templateHtml);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Certificate Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={handlePreviewPDF}
            className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-oecs-red transition flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            PDF Preview
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {previewLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oecs-red mx-auto mb-4"></div>
                <p className="text-gray-600">Generating PDF preview...</p>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">PDF Preview with Sample Data</p>
                <button
                  onClick={handleDownloadPreview}
                  className="flex items-center gap-2 px-4 py-2 bg-oecs-red text-white rounded hover:bg-red-700 transition text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download Preview
                </button>
              </div>
              <iframe
                src={previewUrl}
                className="w-full h-[600px] border-0"
                title="Certificate PDF Preview"
              />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-6">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">HTML Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This shows how the template will look with sample data
                </p>
                <button
                  onClick={handlePreviewPDF}
                  className="px-4 py-2 bg-oecs-red text-white rounded hover:bg-red-700 transition"
                >
                  Generate PDF Preview
                </button>
              </div>

              {/* HTML Preview */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[500px]"
                style={{ fontFamily: "'Times New Roman', serif" }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlPreview) }}
              />

              {/* Sample Data Info */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Preview Sample Data:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>Student Name: <strong>{sampleData.student_name}</strong></li>
                  <li>Course Name: <strong>{sampleData.course_name}</strong></li>
                  <li>Completion Date: <strong>{sampleData.completion_date}</strong></li>
                  <li>Grade: <strong>{sampleData.grade_percentage}%</strong></li>
                  <li>Verification Code: <strong>{sampleData.verification_code}</strong></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

