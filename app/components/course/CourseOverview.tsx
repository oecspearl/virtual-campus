'use client';

import React, { memo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

interface CourseOverviewProps {
  syllabus: string | null;
}

function CourseOverviewInner({ syllabus }: CourseOverviewProps) {
  if (!syllabus) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
        <h2
          className="text-base sm:text-lg font-display text-gray-900 border-l-[3px] pl-3"
          style={{ borderColor: 'var(--theme-primary)' }}
        >
          Course Overview
        </h2>
      </div>
      <div className="p-3 sm:p-4 lg:p-5 rich-text-content-wrapper">
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(syllabus) }} />
      </div>
    </div>
  );
}

const CourseOverview = memo(CourseOverviewInner);
export default CourseOverview;
