'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface SlideshowViewerProps {
  url: string;
  title?: string;
  embedType?: 'auto' | 'google-slides' | 'powerpoint' | 'pdf' | 'iframe';
}

/**
 * SlideshowViewer - Embeds slideshows from various platforms
 * Supports: Google Slides, PowerPoint Online, PDF, and generic iframe embeds
 */
export default function SlideshowViewer({ url, title = 'Slideshow', embedType = 'auto' }: SlideshowViewerProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    // Validate URL first
    if (!url || typeof url !== 'string' || url.trim() === '') {
      setError('No URL provided');
      setEmbedUrl(null);
      return;
    }

    const trimmedUrl = url.trim();

    // Check if it's a valid absolute URL (must start with http:// or https://)
    if (!trimmedUrl.match(/^https?:\/\//i)) {
      setError('Invalid URL. Please provide a full URL starting with http:// or https://');
      setEmbedUrl(null);
      return;
    }

    // Validate URL format
    try {
      new URL(trimmedUrl);
    } catch (e) {
      setError('Invalid URL format');
      setEmbedUrl(null);
      return;
    }

    try {
      const processedUrl = processSlideshowUrl(trimmedUrl, embedType);
      
      // Double-check the processed URL is still valid
      if (!processedUrl || processedUrl.trim() === '') {
        setError('Failed to process slideshow URL');
        setEmbedUrl(null);
        return;
      }

      // Ensure processed URL is also absolute
      if (!processedUrl.match(/^https?:\/\//i)) {
        setError('Unable to convert URL to embeddable format');
        setEmbedUrl(null);
        return;
      }

      setEmbedUrl(processedUrl);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to process slideshow URL');
      setEmbedUrl(null);
    }
  }, [url, embedType]);

  // Handle ESC key to close fullscreen
  useEffect(() => {
    if (!showFullscreen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showFullscreen]);

  // If we can't embed, show a link fallback
  if (error || !embedUrl) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
          >
            <Icon icon="mdi:open-in-new" className="w-4 h-4" />
            Open in new tab
          </a>
        </div>
        <p className="text-sm text-gray-600 mb-2">Unable to embed this slideshow. Please open it in a new tab.</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:presentation" className="w-5 h-5 text-white" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded transition-colors"
              title="Open in new tab"
            >
              <Icon icon="mdi:open-in-new" className="w-5 h-5" />
            </a>
            <button
              onClick={() => setShowFullscreen(true)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded transition-colors"
              title="View fullscreen"
            >
              <Icon icon="mdi:fullscreen" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded Slideshow */}
        <div className="relative w-full" style={{ paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
          <iframe
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full border-0"
            title={title}
            allow="fullscreen"
            loading="lazy"
            allowFullScreen
          />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Fullscreen Header */}
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded transition-colors"
                  title="Open in new tab"
                >
                  <Icon icon="mdi:open-in-new" className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setShowFullscreen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded transition-colors"
                  title="Close fullscreen"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 relative bg-gray-900">
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                title={title}
                allow="fullscreen"
                allowFullScreen
              />
            </div>

            {/* Close hint */}
            <div className="bg-gray-900 px-4 py-2 text-center">
              <p className="text-sm text-white/60">Press ESC or click outside to exit fullscreen</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Process slideshow URL to convert it to an embeddable format
 */
function processSlideshowUrl(url: string, embedType: string): string {
  // Validate input
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error('URL is required');
  }

  // Ensure URL is absolute
  if (!url.match(/^https?:\/\//i)) {
    throw new Error('URL must be absolute (start with http:// or https://)');
  }

  if (embedType === 'iframe') {
    // Direct iframe URL - validate and use as-is
    try {
      new URL(url);
      return url;
    } catch {
      throw new Error('Invalid iframe URL');
    }
  }

  // Auto-detect slideshow type
  if (embedType === 'auto') {
    // Google Slides detection
    if (url.includes('docs.google.com/presentation') || url.includes('google.com/presentation')) {
      return convertGoogleSlidesToEmbed(url);
    }

    // PowerPoint Online detection
    if (url.includes('office.com') && url.includes('/powerpoint') || url.includes('office365.com')) {
      return convertPowerPointToEmbed(url);
    }

    // PDF detection
    if (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf')) {
      return convertPdfToEmbed(url);
    }

    // Generic iframe - validate URL before using
    try {
      new URL(url);
      return url;
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  // Manual type selection
  switch (embedType) {
    case 'google-slides':
      return convertGoogleSlidesToEmbed(url);
    case 'powerpoint':
      return convertPowerPointToEmbed(url);
    case 'pdf':
      return convertPdfToEmbed(url);
    default:
      // Validate URL before returning
      try {
        new URL(url);
        return url;
      } catch {
        throw new Error('Invalid URL format');
      }
  }
}

/**
 * Convert Google Slides URL to embed format
 */
function convertGoogleSlidesToEmbed(url: string): string {
  try {
    // Handle different Google Slides URL formats
    // Format 1: https://docs.google.com/presentation/d/ID/edit
    // Format 2: https://docs.google.com/presentation/d/ID/edit#slide=id.p
    // Format 3: https://docs.google.com/presentation/d/ID/preview
    // Format 4: https://docs.google.com/presentation/d/ID (without trailing path)
    
    let presentationId = '';

    // Extract presentation ID from URL - handle various formats
    // Match: /presentation/d/ID (followed by / or end of string or ?)
    const patterns = [
      /\/presentation\/d\/([a-zA-Z0-9-_]+)(?:\/|$|\?|#)/,  // Standard format
      /\/presentation\/d\/([a-zA-Z0-9-_]+)$/,  // End of URL
      /\/presentation\/d\/([a-zA-Z0-9-_]+)\?/,  // With query params
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        presentationId = match[1];
        break;
      }
    }

    if (!presentationId) {
      throw new Error('Invalid Google Slides URL format');
    }

    // Convert to embed URL
    // Format: https://docs.google.com/presentation/d/ID/preview?usp=sharing&rm=minimal&widget=true&chrome=false
    return `https://docs.google.com/presentation/d/${presentationId}/preview?usp=sharing&rm=minimal&widget=true&chrome=false`;
  } catch (error) {
    throw new Error('Failed to convert Google Slides URL');
  }
}

/**
 * Convert PowerPoint Online URL to embed format
 */
function convertPowerPointToEmbed(url: string): string {
  try {
    // PowerPoint Online URLs are complex
    // We'll try to embed using the web viewer
    // Format: https://view.officeapps.live.com/op/embed.aspx?src=ENCODED_URL
    
    // If already an embed URL, return as-is
    if (url.includes('view.officeapps.live.com')) {
      return url;
    }

    // Try to convert to embed format
    const encodedUrl = encodeURIComponent(url);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  } catch (error) {
    throw new Error('Failed to convert PowerPoint URL');
  }
}

/**
 * Convert PDF URL to embed format
 */
function convertPdfToEmbed(url: string): string {
  // For PDFs, we can use Google Docs viewer or embed directly
  // Direct embedding works if the PDF is publicly accessible
  return url;
}

