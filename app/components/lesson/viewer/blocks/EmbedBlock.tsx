'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import GoogleFileEmbed, { isGoogleWorkspaceUrl } from '@/app/components/media/GoogleFileEmbed';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

export interface EmbedBlockProps {
  index: number;
  lessonId: string;
  /** Display title. Falls back to "Embedded Content". */
  title?: string;
  /** The URL to embed. */
  url: string;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible embed content block. Routes Google Workspace URLs to
 * GoogleFileEmbed (which uses the correct Docs/Sheets/Slides viewer);
 * everything else is rendered in a sandboxed iframe.
 */
export default function EmbedBlock({
  index,
  lessonId,
  title,
  url,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: EmbedBlockProps) {
  const displayTitle = title || 'Embedded Content';
  const isGoogle = isGoogleWorkspaceUrl(url);

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
      <div
        className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">
              Embed
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
                content_type: 'embed',
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
          {isGoogle ? (
            <GoogleFileEmbed url={url} title={displayTitle} height="700px" />
          ) : (
            <div className="border border-gray-100 rounded-md overflow-hidden">
              <iframe
                src={url}
                className="w-full h-[600px] sm:h-[800px] rounded"
                title={displayTitle}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
