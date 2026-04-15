'use client';

import React, { useState } from 'react';
import Button from '@/app/components/ui/Button';

interface CourseBackupButtonProps {
  courseId: string;
  courseTitle: string;
  className?: string;
  userRole?: string;
  /** "link" renders as a plain quick-action row matching sidebar nav style */
  variant?: 'default' | 'link';
}

export default function CourseBackupButton({
  courseId,
  courseTitle,
  className = '',
  userRole = 'student',
  variant = 'default'
}: CourseBackupButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeUserData, setIncludeUserData] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const handleBackup = async () => {
    setDownloading(true);
    setError(null);

    try {
      const url = includeUserData 
        ? `/api/courses/${courseId}/backup?include_user_data=true`
        : `/api/courses/${courseId}/backup`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `course-backup-${courseTitle.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the ZIP file
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      setDownloading(false);
    } catch (err: any) {
      console.error('Backup error:', err);
      setError(err.message || 'Failed to backup course');
      setDownloading(false);
    }
  };

  if (variant === 'link') {
    return (
      <div className={className}>
        <button
          onClick={handleBackup}
          disabled={downloading}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full disabled:opacity-50"
        >
          {downloading ? (
            <svg className="w-4 h-4 text-gray-400 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          {downloading ? 'Creating Backup...' : 'Backup Course'}
        </button>
        {error && <p className="px-3 text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleBackup}
          disabled={downloading}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {downloading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Backup...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Backup
            </>
          )}
        </Button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="text-xs text-gray-600 hover:text-gray-900 underline"
          >
            {showOptions ? 'Hide Options' : 'Advanced Options'}
          </button>
        )}
        {isAdmin && showOptions && (
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeUserData}
              onChange={(e) => setIncludeUserData(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Include user data (enrollments, progress, grades, submissions)</span>
          </label>
        )}
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

