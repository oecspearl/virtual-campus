'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import AudioPlayer from '@/app/components/media/AudioPlayer';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

export interface AudioBlockProps {
  index: number;
  lessonId: string;
  /** Header title. If absent, the header bar is not shown. */
  title?: string;
  /** File id for audio stored in the app. */
  fileId?: string;
  /** Optional explicit URL (takes priority over `fileId`). */
  url?: string;
  /** Optional display name for the audio file. */
  fileName?: string;
  /** Optional transcript text, displayed under the player when enabled. */
  transcript?: string;
  /** Whether to show the transcript panel. */
  showTranscript?: boolean;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible audio content block. Delegates playback to AudioPlayer.
 * When no source is available, renders an empty-state placeholder.
 */
export default function AudioBlock({
  index,
  lessonId,
  title,
  fileId,
  url,
  fileName,
  transcript,
  showTranscript,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: AudioBlockProps) {
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
                Audio
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
                metadata={{ content_type: 'audio', content_title: title, content_index: index }}
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
            <AudioPlayer
              src={src}
              title={title || fileName || 'Audio Content'}
              transcript={transcript}
              showTranscript={showTranscript}
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
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <p className="text-lg font-medium">Audio not uploaded yet</p>
              <p className="text-sm">Upload an audio file to see it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
