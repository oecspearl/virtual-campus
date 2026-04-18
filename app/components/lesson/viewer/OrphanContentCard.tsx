'use client';

import React from 'react';

interface OrphanContentCardProps {
  /** What kind of content was deleted — drives the heading. */
  kind: 'quiz' | 'assignment';
  /** Whether to show the "Remove from Lesson" button (instructors only). */
  canRemove: boolean;
  onRemove: () => void;
}

const KIND_LABEL: Record<OrphanContentCardProps['kind'], string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
};

/**
 * Card shown in place of a quiz or assignment content block when the
 * underlying record has been deleted. Offers instructors a button to
 * remove the orphaned reference from the lesson.
 */
export default function OrphanContentCard({ kind, canRemove, onRemove }: OrphanContentCardProps) {
  const label = KIND_LABEL[kind];

  return (
    <div className="group bg-white rounded-lg overflow-hidden border-2 border-dashed border-gray-300 shadow-sm">
      <div className="bg-gradient-to-br from-gray-400 to-gray-500 px-4 sm:px-6 py-4 sm:py-5">
        <h3 className="text-sm sm:text-base md:text-xl font-bold text-white flex items-center flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <span>{label} Not Found</span>
        </h3>
      </div>
      <div className="p-4 sm:p-6 text-center">
        <p className="text-gray-600 mb-4">
          This {kind} has been deleted and is no longer available.
        </p>
        {canRemove && (
          <button
            onClick={onRemove}
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Remove from Lesson
          </button>
        )}
      </div>
    </div>
  );
}
