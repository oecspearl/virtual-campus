'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import AutoResizeTextContent from '@/app/components/AutoResizeTextContent';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

export interface TextBlockProps {
  index: number;
  lessonId: string;
  /** Optional header title. When present, the block is collapsible. */
  title?: string;
  /** Raw HTML body (sanitized downstream by AutoResizeTextContent). */
  html: string;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;

  /**
   * Called when the user clicks the fullscreen button. The parent owns
   * the overlay state — this block just reports the intent.
   */
  onRequestFullscreen: (title: string, html: string) => void;
}

/**
 * Collapsible rich-text content block. Shows a fullscreen button both in
 * the header (when a title is present) and above the body (when no title
 * is present). When collapsed, the body area animates to zero height.
 */
export default function TextBlock({
  index,
  lessonId,
  title,
  html,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
  onRequestFullscreen,
}: TextBlockProps) {
  const openFullscreen = () => onRequestFullscreen(title || 'Content', html);

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 transition-colors">
      {title && (
        <div
          className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
                Reading
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
                metadata={{ content_type: 'text', content_title: title, content_index: index }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openFullscreen();
                }}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="View fullscreen"
                aria-label="View fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-white/50" />
              </button>
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
        <div className="relative p-4 sm:p-6">
          {!title && (
            <div className="flex justify-end mb-2">
              <button
                onClick={openFullscreen}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 hover:text-slate-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors text-xs"
                title="View fullscreen"
                aria-label="View fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
          )}
          <AutoResizeTextContent
            content={html}
            minHeight={150}
            maxHeight={1000}
            className="text-content prose prose-sm sm:prose-base max-w-none prose-headings:font-medium prose-headings:text-slate-800"
          />
        </div>
      </div>
    </div>
  );
}
