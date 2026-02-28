'use client';

import React, { useState, useRef } from 'react';
import Button from './Button';

interface CourseRestoreButtonProps {
  onRestoreComplete?: (courseId: string) => void;
  className?: string;
}

export default function CourseRestoreButton({ 
  onRestoreComplete,
  className = '' 
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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/courses/restore', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setSuccess(data.message || 'Course restored successfully!');
      
      // Call callback if provided
      if (onRestoreComplete && data.course?.id) {
        setTimeout(() => {
          onRestoreComplete(data.course.id);
        }, 1500);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setRestoring(false);
    } catch (err: any) {
      console.error('Restore error:', err);
      setError(err.message || 'Failed to restore course');
      setRestoring(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

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

