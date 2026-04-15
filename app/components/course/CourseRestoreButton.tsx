'use client';

import React, { useState, useRef } from 'react';
import Button from '@/app/components/ui/Button';

interface CourseRestoreButtonProps {
  onRestoreComplete?: (courseId: string) => void;
  className?: string;
  /** "link" renders as a plain quick-action row matching sidebar nav style */
  variant?: 'default' | 'link';
}

export default function CourseRestoreButton({
  onRestoreComplete,
  className = '',
  variant = 'default'
}: CourseRestoreButtonProps) {
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Get a signed upload URL from Supabase Storage
      const urlRes = await fetch('/api/courses/import/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });

      if (!urlRes.ok) {
        const urlErr = await urlRes.json().catch(() => ({ error: 'Failed to get upload URL' }));
        throw new Error(urlErr.error || 'Failed to get upload URL');
      }

      const { signedUrl, token, storagePath } = await urlRes.json();

      // Step 2: Upload file directly to Supabase Storage (bypasses Vercel body limit)
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/zip' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload backup file to storage');
      }

      // Step 3: Call the restore endpoint with the storage path
      const response = await fetch('/api/courses/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath }),
      });

      // Handle non-JSON responses (e.g., 413 from Vercel)
      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(response.status === 413
          ? 'Backup file is too large'
          : `Server error (${response.status}): ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setSuccess(data.message || 'Course restored successfully!');

      if (onRestoreComplete && data.course?.id) {
        setTimeout(() => {
          onRestoreComplete(data.course.id);
        }, 1500);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setRestoring(false);
    } catch (err: any) {
      console.error('Restore error:', err);
      setError(err.message || 'Failed to restore course');
      setRestoring(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (variant === 'link') {
    return (
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={handleClick}
          disabled={restoring}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full disabled:opacity-50"
        >
          {restoring ? (
            <svg className="w-4 h-4 text-gray-400 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
          {restoring ? 'Restoring...' : 'Restore Course'}
        </button>
        {error && <p className="px-3 text-xs text-red-500 mt-0.5">{error}</p>}
        {success && <p className="px-3 text-xs text-green-600 mt-0.5">{success}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        onClick={handleClick}
        disabled={restoring}
        variant="outline"
        className="w-full sm:w-auto"
      >
        {restoring ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Restoring Course...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Restore Course
          </>
        )}
      </Button>
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-2 text-sm text-green-600">
          {success}
        </div>
      )}
    </div>
  );
}

