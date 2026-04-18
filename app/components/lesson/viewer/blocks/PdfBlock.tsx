'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

export interface PdfBlockProps {
  index: number;
  lessonId: string;
  /** Header title. If absent, the header bar is not shown. */
  title?: string;
  /** File id — PDF is served at `/api/files/:fileId` when no explicit URL. */
  fileId?: string;
  /** Optional explicit URL (takes priority over `fileId`). */
  url?: string;
  /** Display file name inside the card body. Falls back to "PDF Document". */
  fileName?: string;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;

  /**
   * Called when the user clicks "View PDF". Parents use this for
   * activity logging (e.g. recording that the student accessed the PDF).
   */
  onOpen?: (fileName: string) => void;
}

/**
 * Collapsible PDF content block. Shows a file-info card with a "View PDF"
 * link that opens the document in a new tab. When no source is available,
 * renders an empty-state placeholder.
 */
export default function PdfBlock({
  index,
  lessonId,
  title,
  fileId,
  url,
  fileName,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
  onOpen,
}: PdfBlockProps) {
  const src = url || (fileId ? `/api/files/${fileId}` : null);
  const displayName = fileName || 'PDF Document';

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
      {title && (
        <div
          className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
                PDF
              </span>
              <span className="truncate">{title}</span>
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ContentProgressCheckbox isComplete={isComplete} onToggle={onToggleComplete} />
              <BookmarkButton
                type="lesson_content"
                id={lessonId}
                size="sm"
                className="text-white/50 hover:text-white/80"
                metadata={{ content_type: 'pdf', content_title: title, content_index: index }}
              />
              <div className="p-1 rounded hover:bg-white/10 transition-colors">
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-white/50" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-white/50" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        <div className="p-4 sm:p-6">
          {src ? (
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-4 border border-gray-100 rounded-md bg-gray-50/50">
              <div className="flex-1 min-w-0 w-full">
                <p className="font-medium text-slate-800 text-sm">{displayName}</p>
                <p className="text-xs text-slate-400 mt-0.5">Click to view or download</p>
              </div>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpen?.(displayName)}
                className="border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 px-4 py-2 rounded-md text-sm transition-colors flex items-center w-full sm:w-auto justify-center"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                View PDF
              </a>
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium">PDF not uploaded yet</p>
              <p className="text-sm">Upload a PDF to see it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
