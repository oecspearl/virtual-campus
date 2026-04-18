'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import SlideshowViewer from '@/app/components/media/SlideshowViewer';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

export type SlideshowEmbedType = 'iframe' | 'auto' | 'google-slides' | 'powerpoint' | 'pdf';

export interface SlideshowBlockProps {
  index: number;
  lessonId: string;
  /** Slideshow URL (Google Slides / SlideShare / etc.). Required. */
  url: string;
  /** Display title. Falls back to "Slideshow". */
  title?: string;
  /**
   * Embed type hint passed through to SlideshowViewer. Defaults to 'auto',
   * which detects the platform from the URL.
   */
  embedType?: SlideshowEmbedType;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible slideshow content block. When no URL is configured, shows
 * a friendly instructor-facing error card instead of rendering the viewer.
 */
export default function SlideshowBlock({
  index,
  lessonId,
  url,
  title,
  embedType = 'auto' as SlideshowEmbedType,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: SlideshowBlockProps) {
  const displayTitle = title || 'Slideshow';
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return (
      <div className="group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-md p-4">
        <div className="text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-2">{displayTitle}</p>
          <p className="text-red-600">
            No slideshow URL provided. Please edit this lesson to add a slideshow URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
      <div
        className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
              Slides
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
                content_type: 'slideshow',
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
          <SlideshowViewer url={trimmedUrl} title={displayTitle} embedType={embedType} />
        </div>
      </div>
    </div>
  );
}
