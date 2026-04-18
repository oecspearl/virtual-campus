'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BookmarkButton } from '@/app/components/student';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

const CodeSandbox = dynamic(() => import('@/app/components/media/CodeSandbox'), {
  ssr: false,
  loading: () => <div className="w-full aspect-video bg-gray-100 animate-pulse rounded-lg" />,
});

export interface CodeSandboxBlockProps {
  index: number;
  lessonId: string;
  /** Optional header title. If absent, the header is not shown. */
  title?: string;
  /** Internal sandbox title passed to the player. */
  sandboxTitle?: string;
  /** Language identifier (e.g. 'javascript', 'python'). Defaults to 'javascript'. */
  language?: string;
  /** Initial source code. */
  initialCode?: string;
  /** Optional template name. */
  template?: string;
  /** Instructor-authored instructions rendered inside the sandbox. */
  instructions?: string;
  /** If true the editor is read-only. */
  readOnly?: boolean;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isComplete: boolean;
  onToggleComplete: () => void;
}

/**
 * Collapsible code-sandbox content block. Delegates editor + runtime to
 * the lazily-imported CodeSandbox component. Pure presentational shell
 * around that player; the parent still owns progress / bookmark state.
 */
export default function CodeSandboxBlock({
  index,
  lessonId,
  title,
  sandboxTitle,
  language = 'javascript',
  initialCode,
  template,
  instructions,
  readOnly = false,
  isCollapsed,
  onToggleCollapse,
  isComplete,
  onToggleComplete,
}: CodeSandboxBlockProps) {
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
                Code
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
                metadata={{
                  content_type: 'code_sandbox',
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
        <div className="p-0">
          <CodeSandbox
            title={sandboxTitle || title || 'Code Sandbox'}
            language={language}
            initialCode={initialCode}
            template={template}
            instructions={instructions}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
