'use client';

import React, { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';

interface BulkGradeUploadProps {
  courseId: string;
  onSuccess?: () => void;
}

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
  total: number;
}

export default function BulkGradeUpload({ courseId, onSuccess }: BulkGradeUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [templateInfo, setTemplateInfo] = useState<any>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplateInfo = async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/upload`);
      if (res.ok) {
        const data = await res.json();
        setTemplateInfo(data);
      }
    } catch (err) {
      console.error('Error fetching template info:', err);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setResult(null);
    setError('');
    fetchTemplateInfo();
  };

  const handleClose = () => {
    setIsOpen(false);
    setResult(null);
    setError('');
  };

  const downloadTemplate = () => {
    if (!templateInfo?.csv_template) return;

    const blob = new Blob([templateInfo.csv_template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grade_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const grades: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 3) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        if (header === 'student_email') row.student_email = values[index];
        else if (header === 'grade_item') row.grade_item = values[index];
        else if (header === 'score') row.score = parseFloat(values[index]);
        else if (header === 'feedback') row.feedback = values[index] || '';
      });

      if (row.student_email && row.grade_item && !isNaN(row.score)) {
        grades.push(row);
      }
    }

    return grades;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const text = await file.text();
      const grades = parseCSV(text);

      if (grades.length === 0) {
        setError('No valid grades found in CSV file. Please check the format.');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/courses/${courseId}/gradebook/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grades,
          update_existing: updateExisting
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to upload grades');
      } else {
        setResult(data.result);
        if (data.result.success > 0 && onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Icon icon="material-symbols:upload-file" className="w-5 h-5" />
        Import Grades
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                <Icon icon="material-symbols:upload-file" className="w-6 h-6 inline mr-2 text-blue-600" />
                Bulk Grade Upload
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon icon="material-symbols:close" className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">CSV Format</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Upload a CSV file with the following columns:
                </p>
                <code className="block bg-white px-3 py-2 rounded text-sm text-gray-700 mb-2">
                  student_email,grade_item,score,feedback
                </code>
                {templateInfo?.instructions?.notes && (
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    {templateInfo.instructions.notes.map((note: string, i: number) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Grade Items Info */}
              {templateInfo?.grade_items?.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Available Grade Items</h3>
                  <div className="flex flex-wrap gap-2">
                    {templateInfo.grade_items.map((item: any) => (
                      <span
                        key={item.id}
                        className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700"
                      >
                        {item.title} ({item.points || 100} pts)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="updateExisting"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="updateExisting" className="text-sm text-gray-700">
                  Update existing grades (uncheck to skip existing)
                </label>
              </div>

              {/* Download Template */}
              <div>
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  disabled={!templateInfo?.csv_template}
                  className="flex items-center gap-2"
                >
                  <Icon icon="material-symbols:download" className="w-5 h-5" />
                  Download Template CSV
                </Button>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      disabled:opacity-50"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Icon icon="material-symbols:sync" className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-blue-600">Processing...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Error</h4>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={`border rounded-lg p-4 ${
                  result.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <Icon
                      icon={result.failed > 0 ? "material-symbols:warning" : "material-symbols:check-circle"}
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        result.failed > 0 ? 'text-yellow-600' : 'text-green-600'
                      }`}
                    />
                    <div className="flex-1">
                      <h4 className={`font-medium ${result.failed > 0 ? 'text-yellow-900' : 'text-green-900'}`}>
                        Upload Complete
                      </h4>
                      <p className={`text-sm ${result.failed > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                        Successfully imported {result.success} of {result.total} grades
                        {result.failed > 0 && ` (${result.failed} failed)`}
                      </p>
                      {result.errors?.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <p className="text-xs font-medium text-yellow-900 mb-1">Errors:</p>
                          <ul className="text-xs text-yellow-800 space-y-0.5">
                            {result.errors.slice(0, 10).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                            {result.errors.length > 10 && (
                              <li className="text-yellow-600">...and {result.errors.length - 10} more errors</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
