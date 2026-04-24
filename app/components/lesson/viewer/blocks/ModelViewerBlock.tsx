'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

// model-viewer is a web component (custom element). React 19 moved the JSX
// namespace under `react`, so augment there — the old global `JSX` namespace
// isn't picked up at type-check time under Next 15 + React 19.
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

export interface ModelViewerBlockProps {
  index: number;
  lessonId: string;
  title?: string;
  /** GLB/GLTF file id stored in the app. */
  fileId?: string;
  /** Direct URL to a GLB/GLTF file (takes priority over `fileId`). */
  url?: string;
  /** Optional USDZ file URL — enables native Quick Look AR on iOS. */
  iosUrl?: string;
  /** Optional poster image URL shown while the model loads. */
  posterUrl?: string;
  /** Description / alt text for the model. */
  alt?: string;
  /** Enable AR button (Scene Viewer on Android, Quick Look on iOS). */
  enableAR?: boolean;
  /** Auto-rotate the model in the viewport. */
  autoRotate?: boolean;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

export default function ModelViewerBlock({
  index,
  lessonId,
  title,
  fileId,
  url,
  iosUrl,
  posterUrl,
  alt,
  enableAR = true,
  autoRotate = false,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: ModelViewerBlockProps) {
  // The custom element is registered on first import — do it lazily so the
  // ~300KB viewer bundle stays out of the initial page payload for lessons
  // that don't have any 3D blocks.
  React.useEffect(() => {
    import('@google/model-viewer');
  }, []);

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
                3D Model
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
                metadata={{ content_type: '3d_model', content_title: title, content_index: index }}
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
            <model-viewer
              src={src}
              ios-src={iosUrl}
              poster={posterUrl}
              alt={alt || title || '3D model'}
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
                width: '100%',
                height: 'min(70vh, 500px)',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
              }}
            />
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="text-lg font-medium">No 3D model uploaded yet</p>
              <p className="text-sm">Upload a .glb or .gltf file to display an interactive model</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
