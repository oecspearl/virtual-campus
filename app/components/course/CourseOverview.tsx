'use client';

import React from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

interface CourseOverviewProps {
  syllabus: string | null;
}

export default function CourseOverview({ syllabus }: CourseOverviewProps) {
  if (!syllabus) return null;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Overview</h2>
            <p className="text-sm sm:text-base text-gray-600">What you&apos;ll learn in this course</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 lg:p-8 rich-text-content-wrapper">
        <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(syllabus) }} />
      </div>
    </div>
  );
}
