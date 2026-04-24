'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

// model-viewer is a web component. React 19 moved IntrinsicElements under
// the `react` module's JSX namespace, so augment there — a global `JSX`
// augmentation is not picked up by Next 15 + React 19 at type-check time.
// This is the single source of truth for the <model-viewer> JSX type; any
// file that renders the tag must route through this component.
type ModelViewerAttributes = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement> & {
    src?: string;
    'ios-src'?: string;
    poster?: string;
    alt?: string;
    ar?: boolean | '';
    'ar-modes'?: string;
    'ar-scale'?: string;
    'camera-controls'?: boolean | '';
    'auto-rotate'?: boolean | '';
    'shadow-intensity'?: string;
    exposure?: string;
    loading?: 'auto' | 'lazy' | 'eager';
    reveal?: 'auto' | 'interaction' | 'manual';
  },
  HTMLElement
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes;
    }
  }
}

interface Props {
  src: string;
  iosUrl?: string;
  posterUrl?: string;
  alt?: string;
  enableAR?: boolean;
  autoRotate?: boolean;
  /** Non-fullscreen height. Accepts any CSS length. */
  height?: string;
}

export default function ModelViewerWithFullscreen({
  src,
  iosUrl,
  posterUrl,
  alt,
  enableAR = true,
  autoRotate = false,
  height = 'min(70vh, 500px)',
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Register the <model-viewer> custom element on mount. Dynamic import so
  // the ~300KB viewer bundle stays out of the initial payload for lessons
  // that don't render a 3D block.
  useEffect(() => {
    import('@google/model-viewer');
  }, []);

  // Mirror browser fullscreen state back into React so we can swap the icon
  // and resize the viewer to fill the viewport. Listen for the vendor-prefixed
  // event too — iOS Safari < 16.4 only fires `webkitfullscreenchange`.
  useEffect(() => {
    const sync = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = document as any;
      const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
      setIsFullscreen(fsEl === wrapperRef.current);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = document as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEl = el as any;
    const inFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (inFullscreen) {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    } else {
      (anyEl.requestFullscreen || anyEl.webkitRequestFullscreen)?.call(anyEl);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <model-viewer
        src={src}
        ios-src={iosUrl || undefined}
        poster={posterUrl || undefined}
        alt={alt || '3D model'}
        ar={enableAR ? '' : undefined}
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        camera-controls=""
        auto-rotate={autoRotate ? '' : undefined}
        shadow-intensity="1"
        exposure="1"
        loading="lazy"
        reveal="auto"
        style={{
          display: 'block',
          width: '100%',
          height: isFullscreen ? '100vh' : height,
          backgroundColor: '#f8fafc',
          borderRadius: isFullscreen ? 0 : '0.5rem',
        }}
      />
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
        className="absolute top-2 right-2 p-2 rounded-md bg-black/55 text-white hover:bg-black/75 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
