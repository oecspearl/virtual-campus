'use client';

import React from 'react';
import { X } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';

interface FullscreenContentOverlayProps {
  title: string;
  /** Raw HTML — will be sanitized before rendering. */
  html: string;
  onClose: () => void;
}

/**
 * Fullscreen rich-text reading view. Shown when a content block's
 * "expand to fullscreen" button is clicked. Sanitizes the HTML before
 * rendering and wires Escape-to-close at the LessonViewer level.
 */
export default function FullscreenContentOverlay({
  title,
  html,
  onClose,
}: FullscreenContentOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-slate-800 px-4 sm:px-6 py-3 border-b border-slate-700">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-medium text-white truncate mr-4">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-white/60 hover:text-white/90 rounded-md transition-colors flex-shrink-0 text-sm"
            aria-label="Close fullscreen"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div
          className="prose prose-lg max-w-none rich-text-content prose-headings:font-medium prose-headings:text-slate-800"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
      </div>
    </div>
  );
}
