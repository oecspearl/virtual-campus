'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';

interface GoogleFileEmbedProps {
  url: string;
  title?: string;
  height?: string;
  className?: string;
}

/**
 * Embeds Google Workspace files (Docs, Sheets, Slides, Forms, Drive files).
 * Accepts any Google Drive/Docs URL and converts it to an embeddable preview.
 */
export default function GoogleFileEmbed({
  url,
  title = 'Google Document',
  height = '600px',
  className = '',
}: GoogleFileEmbedProps) {
  const [error, setError] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const { embedUrl, fileType, icon } = useMemo(() => {
    if (!url) return { embedUrl: null, fileType: 'unknown', icon: 'mdi:file' };

    // Google Docs
    const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) {
      return {
        embedUrl: `https://docs.google.com/document/d/${docsMatch[1]}/preview`,
        fileType: 'Google Doc',
        icon: 'mdi:file-document',
      };
    }

    // Google Sheets
    const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) {
      return {
        embedUrl: `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`,
        fileType: 'Google Sheet',
        icon: 'mdi:file-table',
      };
    }

    // Google Slides
    const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch) {
      return {
        embedUrl: `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`,
        fileType: 'Google Slides',
        icon: 'mdi:file-presentation-box',
      };
    }

    // Google Forms
    const formsMatch = url.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (formsMatch) {
      return {
        embedUrl: `https://docs.google.com/forms/d/${formsMatch[1]}/viewform?embedded=true`,
        fileType: 'Google Form',
        icon: 'mdi:form-select',
      };
    }

    // Google Drive file (generic)
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return {
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
        fileType: 'Drive File',
        icon: 'mdi:google-drive',
      };
    }

    // Google Drive open URL
    const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (driveOpenMatch) {
      return {
        embedUrl: `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`,
        fileType: 'Drive File',
        icon: 'mdi:google-drive',
      };
    }

    // Google Drive uc export URL
    const driveUcMatch = url.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/);
    if (driveUcMatch) {
      return {
        embedUrl: `https://drive.google.com/file/d/${driveUcMatch[1]}/preview`,
        fileType: 'Drive File',
        icon: 'mdi:google-drive',
      };
    }

    // Already a preview/embed URL - use as-is
    if (url.includes('google.com') && (url.includes('/preview') || url.includes('/viewform') || url.includes('/embed'))) {
      return {
        embedUrl: url,
        fileType: 'Google File',
        icon: 'mdi:google-drive',
      };
    }

    return { embedUrl: null, fileType: 'unknown', icon: 'mdi:file' };
  }, [url]);

  if (!embedUrl) {
    return (
      <div className={`border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <Icon icon="mdi:link-variant-off" className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-500">Unable to embed this URL</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          <Icon icon="material-symbols:open-in-new" className="w-4 h-4 mr-1" />
          Open in new tab
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <Icon icon="material-symbols:error-outline" className="w-10 h-10 mx-auto mb-2 text-amber-400" />
        <p className="text-sm text-gray-600 mb-2">Could not load preview</p>
        <p className="text-xs text-gray-400 mb-3">The file may require sign-in or sharing permissions</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          <Icon icon="material-symbols:open-in-new" className="w-4 h-4 mr-1" />
          Open in Google
        </a>
      </div>
    );
  }

  return (
    <>
      <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Icon icon={icon} className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">{fileType}</span>
            <span className="text-xs text-gray-400 truncate max-w-[200px]">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFullscreen(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Fullscreen"
            >
              <Icon icon="material-symbols:fullscreen" className="w-4 h-4" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Open in new tab"
            >
              <Icon icon="material-symbols:open-in-new" className="w-4 h-4" />
            </a>
          </div>
        </div>
        {/* Iframe */}
        <iframe
          src={embedUrl}
          style={{ height }}
          className="w-full border-0"
          title={title}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
          onError={() => setError(true)}
        />
      </div>

      {/* Fullscreen modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black/50">
            <div className="flex items-center gap-2">
              <Icon icon={icon} className="w-5 h-5 text-white/70" />
              <span className="text-sm text-white/90 font-medium">{title}</span>
              <span className="text-xs text-white/50">{fileType}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Icon icon="material-symbols:open-in-new" className="w-5 h-5" />
              </a>
              <button
                onClick={() => setShowFullscreen(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Icon icon="material-symbols:close" className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Utility: detect if a URL is a Google Workspace URL
 */
export function isGoogleWorkspaceUrl(url: string): boolean {
  if (!url) return false;
  return /docs\.google\.com\/(document|spreadsheets|presentation|forms)\/d\//.test(url)
    || /drive\.google\.com\/(file\/d\/|open\?id=|uc\?id=)/.test(url);
}

/**
 * Utility: extract file ID from any Google Drive/Docs URL
 */
export function extractGoogleFileId(url: string): string | null {
  const patterns = [
    /docs\.google\.com\/(?:document|spreadsheets|presentation|forms)\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
