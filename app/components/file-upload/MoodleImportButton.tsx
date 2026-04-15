'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

interface MoodleImportButtonProps {
  onImportComplete?: (courseId: string) => void;
  className?: string;
}

export default function MoodleImportButton({
  onImportComplete,
  className = ''
}: MoodleImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [courseName, setCourseName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.mbz') && !selectedFile.name.endsWith('.zip') && !selectedFile.name.endsWith('.xml')) {
        setError('Please select a backup file (.mbz, .zip, or .xml)');
        return;
      }
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError('File size must be less than 500MB');
        return;
      }
      setFile(selectedFile);
      setError('');
      // Auto-fill course name from file name if not set
      if (!courseName) {
        const nameWithoutExt = selectedFile.name.replace(/\.(mbz|zip|xml)$/i, '');
        setCourseName(nameWithoutExt);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a backup file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      // Step 1: Get a signed upload URL from the server (bypasses Storage RLS)
      setUploadStatus('Preparing upload...');
      const urlResponse = await fetch('/api/courses/import/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name })
      });

      if (!urlResponse.ok) {
        const urlError = await urlResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to prepare upload: ${urlError.error || urlResponse.statusText}`);
      }

      const { signedUrl, storagePath } = await urlResponse.json();

      // Step 2: Upload file directly to Supabase Storage using signed URL
      setUploadStatus('Uploading file...');
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file
      });

      if (!uploadResponse.ok) {
        const uploadErr = await uploadResponse.text().catch(() => 'Unknown error');
        throw new Error(`Failed to upload file: ${uploadErr}`);
      }

      // Step 3: Call the import API with just the storage path (AI-powered parsing)
      setUploadStatus('Analyzing course structure with AI...');
      const response = await fetch('/api/courses/import/moodle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath,
          fileName: file.name,
          courseName: courseName.trim() || undefined
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text || 'Unknown error'}`);
      }

      if (!response.ok) {
        let errorMsg = data.error || 'Failed to import course';
        if (data.details) {
          errorMsg += `: ${data.details}`;
        }
        if (data.troubleshooting && Array.isArray(data.troubleshooting)) {
          errorMsg += `\n\nTroubleshooting:\n${data.troubleshooting.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`;
        }
        throw new Error(errorMsg);
      }

      setSuccess(true);
      setImportResult(data);

      if (onImportComplete && data.course?.id) {
        onImportComplete(data.course.id);
      }

      setTimeout(() => {
        setIsOpen(false);
        if (data.course?.id) {
          router.push(`/course/${data.course.id}`);
        }
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import course');
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const handleReset = () => {
    setFile(null);
    setCourseName('');
    setError('');
    setSuccess(false);
    setImportResult(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${className}`}
        style={{
          background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))',
          color: 'white'
        }}
      >
        <Icon icon="material-symbols:upload" className="w-5 h-5" />
        <span>Import Course</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Import Course</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload a platform backup (.zip) or Moodle backup (.mbz, .xml) — AI-powered parsing
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleReset();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon icon="material-symbols:close" className="w-6 h-6" />
                </button>
              </div>

              {!success ? (
                <>
                  {/* File Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Backup File (.zip, .mbz, or .xml)
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {file ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center">
                            <Icon icon="material-symbols:check-circle" className="w-12 h-12 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-600">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={handleReset}
                            className="text-sm text-gray-600 hover:text-gray-900 underline"
                          >
                            Choose different file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Icon icon="material-symbols:cloud-upload" className="w-12 h-12 text-gray-400 mx-auto" />
                          <div>
                            <p className="text-gray-700 mb-2">
                              Drag and drop your Moodle backup file here, or
                            </p>
                            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors"
                              style={{
                                background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))',
                                color: 'white'
                              }}
                            >
                              <Icon icon="material-symbols:upload" className="w-5 h-5" />
                              <span>Browse Files</span>
                              <input
                                type="file"
                                accept=".mbz,.zip,.xml"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                              Supported: Platform backup (.zip), Moodle backup (.mbz), Moodle XML (.xml)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Course Name */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="Leave empty to use Moodle course name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If not specified, the course name from the Moodle backup will be used
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-red-800 font-semibold mb-2">{error}</p>
                          {error.includes('Invalid file format') && (
                            <div className="mt-3 space-y-2 text-sm text-red-700">
                              <p className="font-medium">Common causes:</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>The file might not be a complete Moodle backup</li>
                                <li>The file may have been corrupted during download/upload</li>
                                <li>You might have selected the wrong file type</li>
                                <li>The Moodle export may not have completed successfully</li>
                              </ul>
                              <p className="font-medium mt-3">How to fix:</p>
                              <ol className="list-decimal list-inside space-y-1 ml-2">
                                <li>Go to Moodle: Site administration → Courses → Backup courses</li>
                                <li>Select your course and click "Continue"</li>
                                <li>Choose "Course backup" (not site backup)</li>
                                <li>Wait for the export to complete fully</li>
                                <li>Download the .mbz file</li>
                                <li>Try uploading again</li>
                              </ol>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleReset();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!file || uploading}
                      className="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: !file || uploading 
                          ? '#9CA3AF' 
                          : 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))'
                      }}
                    >
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.3s' }} />
                          </span>
                          {uploadStatus || 'Importing...'}
                        </span>
                      ) : (
                        'Import Course'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Success Message */
                <div className="text-center py-8">
                  <Icon icon="material-symbols:check-circle" className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Import Successful!</h3>
                  {importResult && (
                    <div className="space-y-2 mb-6">
                      <p className="text-gray-700">
                        Course: <span className="font-semibold">{importResult.course?.title}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Imported {importResult.imported?.subjects || 0} sections and {importResult.imported?.lessons || 0} lessons
                      </p>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                          <p className="text-sm font-semibold text-yellow-800 mb-2">Some items could not be imported:</p>
                          <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                            {importResult.errors.slice(0, 5).map((err: string, idx: number) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-600">Redirecting to course...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

