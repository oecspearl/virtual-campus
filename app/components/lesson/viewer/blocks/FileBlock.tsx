'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

export interface FileBlockProps {
  index: number;
  lessonId: string;
  /** Header title. Falls back to "File". Header is always shown. */
  title?: string;
  /** File id — served at `/api/files/:fileId` when no explicit URL. */
  fileId?: string;
  /** Optional explicit URL (takes priority over `fileId`). */
  url?: string;
  /** Display name inside the card body. Falls back to `title`. */
  fileName?: string;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;

  /** Called when the user clicks Download. Parents use this to log activity. */
  onDownload?: (fileName: string) => void;
}

/**
 * Collapsible file-download content block. Unlike ImageBlock / PdfBlock /
 * EmbedBlock / AudioBlock, the header is always rendered (no title-gated
 * conditional render) — this matches the original inline JSX.
 */
export default function FileBlock({
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
  onDownload,
}: FileBlockProps) {
  const src = url || (fileId ? `/api/files/${fileId}` : null);
  const displayTitle = title || 'File';
  const displayName = fileName || displayTitle;

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
      <div
        className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
              File
            </span>
            <span className="truncate">{displayTitle}</span>
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ContentProgressCheckbox isComplete={isComplete} onToggle={onToggleComplete} />
            <BookmarkButton
              type="lesson_content"
              id={lessonId}
              size="sm"
              className="text-white/50 hover:text-white/80"
              metadata={{
                content_type: 'file',
                content_title: displayTitle,
                content_index: index,
              }}
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
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        <div className="p-4 sm:p-6">
          {src ? (
            <div className="flex flex-col sm:flex-row items-start gap-3 p-4 border border-gray-100 rounded-md bg-gray-50/50">
              <div className="flex-1 min-w-0 w-full">
                <p className="font-medium text-slate-800 text-sm">{displayName}</p>
                <p className="text-xs text-slate-400 mt-0.5">Click to download</p>
              </div>
              <a
                href={src}
                download
                onClick={() => onDownload?.(displayName)}
                className="border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 px-4 py-2 rounded-md text-sm transition-colors text-center w-full sm:w-auto"
              >
                Download
              </a>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
              File not uploaded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
