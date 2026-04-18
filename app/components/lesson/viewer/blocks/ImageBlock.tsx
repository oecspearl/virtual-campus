'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

export interface ImageBlockProps {
  /** Block index in the lesson content array (used for bookmark metadata). */
  index: number;
  /** Lesson id the image belongs to. */
  lessonId: string;
  /** Optional header title. If absent, the header bar is not shown. */
  title?: string;
  /** File id for images stored in the app. */
  fileId?: string;
  /** Optional explicit image URL (takes priority over `fileId`-derived URL). */
  url?: string;
  /** Alt text for the image. Falls back to `title` then 'Image'. */
  alt?: string;

  // Collapse + progress state owned by the parent
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible image content block. When `fileId` or `url` is present the
 * image renders; otherwise an empty-state placeholder is shown. The
 * parent owns collapse + completion state.
 */
export default function ImageBlock({
  index,
  lessonId,
  title,
  fileId,
  url,
  alt,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: ImageBlockProps) {
  const src = url || (fileId ? `/api/files/${fileId}` : null);

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
                Image
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
                metadata={{ content_type: 'image', content_title: title, content_index: index }}
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
            <div className="text-center">
              <img
                src={src}
                alt={alt || title || 'Image'}
                className="max-w-full h-auto rounded-lg mx-auto"
                loading="lazy"
              />
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium">Image not uploaded yet</p>
              <p className="text-sm">Upload an image to see it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
