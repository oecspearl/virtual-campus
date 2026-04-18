'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import { sanitizeHtml } from '@/lib/sanitize';
import type { CheckpointQuestion } from '@/app/components/media/InteractiveVideoPlayer';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

const InteractiveVideoPlayer = dynamic(
  () => import('@/app/components/media/InteractiveVideoPlayer'),
  {
    ssr: false,
    loading: () => <div className="w-full aspect-video bg-gray-100 animate-pulse rounded-lg" />,
  }
);

// Accept raw stored checkpoint shape — may use snake_case, may use camelCase
// — and normalize to the CheckpointQuestion contract the player expects.
interface RawCheckpoint {
  id?: string;
  timestamp?: number;
  questionText?: string;
  question_text?: string;
  questionType?: string;
  question_type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  correctAnswer?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  correct_answer?: any;
  feedback?: string;
  points?: number;
}

export function normalizeCheckpoints(raw: RawCheckpoint[] = []): CheckpointQuestion[] {
  return raw.map((cp) => ({
    id: cp.id || cp.timestamp?.toString() || '',
    timestamp: Number(cp.timestamp || 0),
    questionText: cp.questionText || cp.question_text || '',
    questionType:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((cp.questionType || cp.question_type || 'multiple_choice') as any),
    options: cp.options || [],
    correctAnswer: cp.correctAnswer || cp.correct_answer,
    feedback: cp.feedback || '',
    points: cp.points || 1,
  }));
}

export interface InteractiveVideoBlockProps {
  index: number;
  lessonId: string;
  /** Optional header title. If absent, the header is not shown. */
  title?: string;
  /** Video src URL (or uses fileId fallback). */
  url?: string;
  /** Legacy field name for video URL. */
  videoUrl?: string;
  /** App-hosted file id — `/api/files/:fileId` fallback. */
  fileId?: string;
  /** Internal video title passed to the player. */
  videoTitle?: string;
  /** Raw checkpoint objects from storage — normalized inside the block. */
  checkpoints?: RawCheckpoint[];
  /** Optional rich-text notes shown under the player. */
  description?: string;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible interactive-video content block (video + embedded quiz
 * checkpoints). Delegates playback + checkpoint UI to InteractiveVideoPlayer
 * (lazily imported). Normalizes checkpoint field names so stored data in
 * either snake_case or camelCase "just works".
 *
 * Shows a header badge like "3 checkpoints" when checkpoints are present.
 */
export default function InteractiveVideoBlock({
  index,
  lessonId,
  title,
  url,
  videoUrl,
  fileId,
  videoTitle,
  checkpoints = [],
  description,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: InteractiveVideoBlockProps) {
  const src = url || videoUrl || (fileId ? `/api/files/${fileId}` : null);

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
                Interactive
              </span>
              <span className="truncate">{title}</span>
              {checkpoints.length > 0 && (
                <span className="ml-3 px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-slate-400 font-normal">
                  {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ContentProgressCheckbox isComplete={isComplete} onToggle={onToggleComplete} />
              <BookmarkButton
                type="lesson_content"
                id={lessonId}
                size="sm"
                className="text-white/50 hover:text-white/80"
                metadata={{
                  content_type: 'interactive_video',
                  content_title: title,
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
      )}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        <div className="p-4 sm:p-6">
          {src ? (
            <>
              <InteractiveVideoPlayer
                src={src}
                title={videoTitle || title || 'Interactive Video'}
                checkpoints={normalizeCheckpoints(checkpoints)}
                showProgress={true}
              />
              {description && (
                <div className="mt-4 pl-4 border-l-2 border-slate-200">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Notes
                  </h4>
                  <div
                    className="prose prose-sm max-w-none text-slate-600 prose-headings:text-slate-800 prose-headings:font-medium"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                  />
                </div>
              )}
            </>
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium">Interactive video not configured yet</p>
              <p className="text-sm">Upload a video and add checkpoints to see it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
