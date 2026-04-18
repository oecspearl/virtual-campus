'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

const WhiteboardViewer = dynamic(
  () => import('@/app/components/whiteboard/WhiteboardViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-video bg-gray-100 animate-pulse rounded-lg" />
    ),
  }
);

export interface WhiteboardBlockProps {
  /** Optional header title. If absent, the header bar is not shown.
   * (Note: whiteboard blocks historically do not render a bookmark button.) */
  title?: string;
  /** Existing saved whiteboard id, if any. */
  whiteboardId?: string;
  /** Rendered Excalidraw elements. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements?: any;
  /** Excalidraw app state. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appState?: any;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible whiteboard content block. Lazily imports WhiteboardViewer
 * (Excalidraw wrapper) so the viewer's heavy bundle only loads when
 * needed. Does not render a bookmark button — matching the original
 * inline behaviour of this content type.
 */
export default function WhiteboardBlock({
  title,
  whiteboardId,
  elements,
  appState,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: WhiteboardBlockProps) {
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
                Board
              </span>
              <span className="truncate">{title}</span>
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ContentProgressCheckbox isComplete={isComplete} onToggle={onToggleComplete} />
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
        <div className="p-4">
          <WhiteboardViewer
            whiteboardId={whiteboardId}
            elements={elements}
            appState={appState}
            title={title}
            height="450px"
          />
        </div>
      </div>
    </div>
  );
}
