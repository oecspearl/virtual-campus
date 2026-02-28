"use client";

import React, { useRef } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

interface AutoResizeTextContentProps {
  content: string;
  title?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

export default function AutoResizeTextContent({ 
  content, 
  title, 
  className = "",
  minHeight = 100,
  maxHeight = 2000
}: AutoResizeTextContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        {title && (
          <h5 className="text-sm text-gray-900 font-medium">{title}</h5>
        )}
        <div 
          ref={containerRef}
          className="overflow-y-auto overscroll-contain"
          style={{ 
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            WebkitOverflowScrolling: 'touch',
            scrollbarGutter: 'stable',
          }}
        >
          <div 
            ref={contentRef}
            className="prose prose-sm max-w-none w-full rich-text-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} 
          />
        </div>
      </div>
      
      {/* Global styles for rich text content rendering */}
      <style jsx global>{`
        /* Fix heading rendering in rich text content */
        .rich-text-content.prose h1,
        .rich-text-content.prose h2,
        .rich-text-content.prose h3,
        .rich-text-content.prose h4,
        .rich-text-content.prose h5,
        .rich-text-content.prose h6 {
          display: block !important;
          font-weight: bold !important;
          margin-top: 1em !important;
          margin-bottom: 0.5em !important;
          color: #1a1a1a !important;
          line-height: 1.2 !important;
        }
        
        .rich-text-content.prose h1 {
          font-size: 2em !important;
          font-weight: 700 !important;
        }
        
        .rich-text-content.prose h2 {
          font-size: 1.5em !important;
          font-weight: 700 !important;
        }
        
        .rich-text-content.prose h3 {
          font-size: 1.25em !important;
          font-weight: 600 !important;
        }
        
        .rich-text-content.prose h4 {
          font-size: 1.125em !important;
          font-weight: 600 !important;
        }
        
        .rich-text-content.prose h5 {
          font-size: 1em !important;
          font-weight: 600 !important;
        }
        
        .rich-text-content.prose h6 {
          font-size: 0.875em !important;
          font-weight: 600 !important;
        }
        
        /* Fix list rendering in rich text content */
        .rich-text-content.prose ul,
        .rich-text-content.prose ol {
          list-style-position: outside !important;
          padding-left: 2em !important;
          list-style-type: disc !important;
        }
        
        .rich-text-content.prose ol {
          list-style-type: decimal !important;
        }
        
        .rich-text-content.prose li {
          display: list-item !important;
          list-style-position: outside !important;
          margin-left: 0 !important;
          padding-left: 0.5em !important;
        }
        
        /* Prevent list item paragraphs from wrapping bullets/numbers */
        .rich-text-content.prose li p {
          display: inline !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Ensure list content stays on same line */
        .rich-text-content.prose li > p:first-child {
          display: inline !important;
        }
        
        /* Table row shading */
        .rich-text-content.prose table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        
        .rich-text-content.prose table tbody tr:nth-child(even),
        .rich-text-content.prose table > tr:nth-child(even) {
          background-color: #f9fafb !important;
        }
        
        .rich-text-content.prose table tbody tr:nth-child(odd),
        .rich-text-content.prose table > tr:nth-child(odd) {
          background-color: #ffffff !important;
        }
        
        .rich-text-content.prose table tbody tr:hover,
        .rich-text-content.prose table > tr:hover {
          background-color: #f1f8e9 !important;
        }
        
        /* Ensure header row maintains background */
        .rich-text-content.prose table thead tr,
        .rich-text-content.prose table > tr:first-child {
          background-color: #f1f8e9 !important;
        }
        
        .rich-text-content.prose th {
          background-color: #f1f8e9 !important;
          font-weight: bold;
        }
        
        .rich-text-content.prose th,
        .rich-text-content.prose td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
        }
        
        /* Ensure background colors render properly */
        .rich-text-content.prose mark {
          padding: 0.125em 0.25em;
          border-radius: 0.25em;
          display: inline;
        }
        
        .rich-text-content.prose mark[data-color] {
          background-color: var(--highlight-color);
        }
        
        /* Preserve background colors from style attributes */
        .rich-text-content.prose [style*="background-color"],
        .rich-text-content.prose [style*="background"] {
          /* Inline styles will be applied by browser */
        }
        
        /* Ensure elements with background colors are visible */
        .rich-text-content.prose span[style*="background"],
        .rich-text-content.prose p[style*="background"],
        .rich-text-content.prose div[style*="background"],
        .rich-text-content.prose h1[style*="background"],
        .rich-text-content.prose h2[style*="background"],
        .rich-text-content.prose h3[style*="background"],
        .rich-text-content.prose h4[style*="background"],
        .rich-text-content.prose h5[style*="background"],
        .rich-text-content.prose h6[style*="background"] {
          display: block !important;
        }
      `}</style>
    </>
  );
}
