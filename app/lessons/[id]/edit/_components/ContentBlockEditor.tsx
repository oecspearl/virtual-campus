'use client';

import React, { useState } from 'react';
import TextEditor from '@/app/components/TextEditor';
import FileUpload, { UploadResult } from '@/app/components/FileUpload';

type ContentItem = {
  type: 'video' | 'text' | 'slideshow' | 'file' | 'embed' | 'quiz' | 'survey' | 'assignment' | 'image' | 'pdf' | 'audio' | 'interactive_video' | 'code_sandbox' | 'label' | 'whiteboard';
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  id?: string;
};

interface ContentBlockEditorProps {
  item: ContentItem;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (data: any) => void;
  onTitleChange: (title: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFileUploaded: (res: { fileId: string; fileName: string; fileUrl: string; fileSize: number; fileType: string }) => void;
  onOpenQuizSelector: () => void;
  onOpenSurveySelector: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  text: 'Aa',
  video: '\u25B6',
  audio: '\u266A',
  interactive_video: '\u25B6\u2022',
  code_sandbox: '</>',
  image: '\u25FB',
  pdf: 'PDF',
  file: '\uD83D\uDCCE',
  embed: '\u27E8\u27E9',
  slideshow: '\u25A4',
  quiz: '?',
  survey: '\u2261',
  assignment: '\u270E',
  label: '\u2014',
  whiteboard: '\u25EB',
};

const TYPE_LABELS: Record<string, string> = {
  text: 'Text Content',
  video: 'Video',
  audio: 'Audio',
  interactive_video: 'Interactive Video',
  code_sandbox: 'Code Sandbox',
  image: 'Image',
  pdf: 'PDF Document',
  file: 'File',
  embed: 'Embed',
  slideshow: 'Slideshow',
  quiz: 'Quiz',
  survey: 'Survey',
  assignment: 'Assignment',
  label: 'Label',
  whiteboard: 'Whiteboard',
};

export default function ContentBlockEditor({
  item,
  index,
  onChange,
  onTitleChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onFileUploaded,
  onOpenQuizSelector,
  onOpenSurveySelector,
  isFirst,
  isLast,
}: ContentBlockEditorProps) {
  const [collapsed, setCollapsed] = useState(true);

  const d = item.data || {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch = (updates: Record<string, any>) => {
    onChange({ ...d, ...updates });
  };

  const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-4 py-3 cursor-pointer select-none transition-colors ${
          collapsed ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white border-b border-gray-200'
        }`}
        onClick={() => setCollapsed(!collapsed)}
      >
        {/* Type icon */}
        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-gray-200 text-xs font-bold text-gray-700">
          {TYPE_ICONS[item.type] || '?'}
        </span>

        {/* Title input */}
        <input
          value={item.title}
          onChange={(e) => onTitleChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mr-2"
          placeholder={`${TYPE_LABELS[item.type] || item.type} title...`}
        />

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '\u25BC' : '\u25B2'}
        </button>

        {/* Move up */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={isFirst}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          \u2191
        </button>

        {/* Move down */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={isLast}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          \u2193
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          title="Remove"
        >
          Remove
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-4">
          {/* TEXT */}
          {item.type === 'text' && (
            <TextEditor
              value={typeof d === 'string' ? d : (d?.html || '')}
              onChange={(html: string) => onChange(html)}
            />
          )}

          {/* VIDEO */}
          {item.type === 'video' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Video URL</label>
                <input
                  value={String(d?.url || '')}
                  onChange={(e) => patch({ url: e.target.value })}
                  placeholder="Video URL (YouTube, Vimeo, etc.)"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Video Title</label>
                <input
                  value={String(d?.title || '')}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Video title"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Video Description / Notes for Students</label>
                <TextEditor
                  value={String(d?.description || '')}
                  onChange={(html: string) => patch({ description: html })}
                  placeholder="Add context, key points, or instructions for students about this video..."
                  height={200}
                />
                <p className="mt-1 text-xs text-gray-500">Provide additional context, key takeaways, or viewing instructions for students</p>
              </div>
            </div>
          )}

          {/* AUDIO */}
          {item.type === 'audio' && (
            <div className="space-y-3">
              <FileUpload onUploaded={onFileUploaded} />
              <div className="text-xs text-gray-500">
                Supported formats: MP3, WAV, OGG, M4A. Maximum file size: 50MB
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-600">Transcript (optional)</label>
                <textarea
                  value={String(d?.transcript || '')}
                  onChange={(e) => patch({ transcript: e.target.value })}
                  placeholder="Enter transcript text for accessibility..."
                  rows={4}
                  className={inputCls}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`show-transcript-${index}`}
                    checked={Boolean(d?.showTranscript)}
                    onChange={(e) => patch({ showTranscript: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`show-transcript-${index}`} className="text-xs text-gray-600">
                    Show transcript by default
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* INTERACTIVE VIDEO */}
          {item.type === 'interactive_video' && (
            <InteractiveVideoEditor
              data={d}
              index={index}
              onChange={onChange}
              inputCls={inputCls}
            />
          )}

          {/* CODE SANDBOX */}
          {item.type === 'code_sandbox' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Programming Language</label>
                <select
                  value={d?.language || 'javascript'}
                  onChange={(e) => patch({ language: e.target.value })}
                  className={inputCls}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="html">HTML/CSS/JS</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="sql">SQL</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Initial Code</label>
                <textarea
                  value={d?.code || d?.initialCode || ''}
                  onChange={(e) => patch({ code: e.target.value, initialCode: e.target.value })}
                  rows={12}
                  className="w-full rounded-md border bg-gray-900 text-green-400 font-mono text-sm p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your code here..."
                  style={{
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
                    tabSize: 2,
                  }}
                  spellCheck={false}
                />
                <div className="text-xs text-gray-500">
                  Students can edit and run this code. Leave empty to use the default template.
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Instructions (optional)</label>
                <textarea
                  value={d?.instructions || ''}
                  onChange={(e) => patch({ instructions: e.target.value })}
                  rows={3}
                  className={inputCls}
                  placeholder="Provide instructions or learning objectives for this code exercise..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`readonly-${index}`}
                  checked={d?.readOnly || false}
                  onChange={(e) => patch({ readOnly: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`readonly-${index}`} className="text-xs text-gray-700">
                  Read-only mode (students cannot edit code)
                </label>
              </div>
            </div>
          )}

          {/* IMAGE / PDF */}
          {(item.type === 'image' || item.type === 'pdf') && (
            <FileUpload onUploaded={onFileUploaded} />
          )}

          {/* FILE */}
          {item.type === 'file' && (
            <FileUpload onUploaded={onFileUploaded} />
          )}

          {/* EMBED */}
          {item.type === 'embed' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Embed URL</label>
                <input
                  value={String(d?.url || '')}
                  onChange={(e) => patch({ url: e.target.value })}
                  placeholder="Embed URL"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Content Title</label>
                <input
                  value={String(d?.title || '')}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Content title"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* SLIDESHOW */}
          {item.type === 'slideshow' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Slideshow URL</label>
                <input
                  value={String(d?.url || '')}
                  onChange={(e) => patch({ url: e.target.value })}
                  placeholder="Slideshow URL (Google Slides, PowerPoint, PDF, etc.)"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Slideshow Title</label>
                <input
                  value={String(d?.title || '')}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Slideshow title"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Embed Type (optional)</label>
                <select
                  value={String(d?.embedType || 'auto')}
                  onChange={(e) => patch({ embedType: e.target.value })}
                  className={inputCls}
                >
                  <option value="auto">Auto-detect (recommended)</option>
                  <option value="google-slides">Google Slides</option>
                  <option value="powerpoint">PowerPoint Online</option>
                  <option value="pdf">PDF Document</option>
                  <option value="iframe">Direct iframe</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-detect will automatically identify the slideshow type from the URL.
                  You can manually select if needed.
                </p>
              </div>
            </div>
          )}

          {/* QUIZ */}
          {item.type === 'quiz' && (
            <div className="space-y-3">
              {d?.quizId ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900">Quiz Selected</p>
                    <p className="text-xs text-green-700 font-mono truncate">{d.quizId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenQuizSelector}
                    className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => patch({ quizId: '' })}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenQuizSelector}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-all group"
                >
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
                    Select or Create Quiz
                  </span>
                </button>
              )}
              <details className="text-xs">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Advanced: Enter Quiz ID manually</summary>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={String(d?.quizId || '')}
                    onChange={(e) => patch({ quizId: e.target.value })}
                    placeholder="Enter quiz ID"
                    className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700 font-mono"
                  />
                </div>
              </details>
            </div>
          )}

          {/* SURVEY */}
          {item.type === 'survey' && (
            <div className="space-y-3">
              {d?.surveyId ? (
                <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-teal-900">Survey Selected</p>
                    <p className="text-xs text-teal-700 font-mono truncate">{d.surveyId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSurveySelector}
                    className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => patch({ surveyId: '' })}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSurveySelector}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 hover:border-teal-400 hover:bg-teal-50 rounded-lg transition-all group"
                >
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-teal-600">
                    Select or Create Survey
                  </span>
                </button>
              )}
              <details className="text-xs">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Advanced: Enter Survey ID manually</summary>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={String(d?.surveyId || '')}
                    onChange={(e) => patch({ surveyId: e.target.value })}
                    placeholder="Enter survey ID"
                    className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700 font-mono"
                  />
                </div>
              </details>
            </div>
          )}

          {/* ASSIGNMENT */}
          {item.type === 'assignment' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Assignment ID:</span>
                <input
                  value={String(d?.assignmentId || '')}
                  onChange={(e) => patch({ assignmentId: e.target.value })}
                  placeholder="Enter assignment ID"
                  className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700"
                />
                <button
                  type="button"
                  onClick={() => window.open('/assignments/create', '_blank')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Create New Assignment
                </button>
              </div>
              <p className="text-xs text-gray-500">Create an assignment first, then enter its ID here</p>
            </div>
          )}

          {/* LABEL */}
          {item.type === 'label' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Label Text</label>
                <input
                  value={String(d?.text || '')}
                  onChange={(e) => patch({ text: e.target.value })}
                  placeholder="Enter section label or divider text..."
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Style</label>
                  <select
                    value={d?.style || 'heading'}
                    onChange={(e) => patch({ style: e.target.value })}
                    className={inputCls}
                  >
                    <option value="heading">Heading</option>
                    <option value="divider">Divider with Text</option>
                    <option value="section">Section Header</option>
                    <option value="banner">Banner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                  <select
                    value={d?.size || 'medium'}
                    onChange={(e) => patch({ size: e.target.value })}
                    className={inputCls}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Use labels to organize and separate content sections within your lesson.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Interactive Video sub-editor (extracted for readability)           */
/* ------------------------------------------------------------------ */

function InteractiveVideoEditor({
  data,
  index,
  onChange,
  inputCls,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (data: any) => void;
  inputCls: string;
}) {
  const [collapsedCheckpoints, setCollapsedCheckpoints] = useState<Record<number, boolean>>({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch = (updates: Record<string, any>) => {
    onChange({ ...data, ...updates });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateCheckpoint = (cpIdx: number, cpUpdates: Record<string, any>) => {
    const checkpoints = [...(data?.checkpoints || [])];
    checkpoints[cpIdx] = { ...checkpoints[cpIdx], ...cpUpdates };
    patch({ checkpoints });
  };

  const toggleCheckpointCollapse = (cpIdx: number) => {
    setCollapsedCheckpoints((prev) => ({ ...prev, [cpIdx]: !prev[cpIdx] }));
  };

  return (
    <div className="space-y-4">
      {/* Video Source */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Video Source</label>
        <div className="space-y-2">
          <input
            value={data?.videoUrl ?? data?.url ?? ''}
            onChange={(e) => patch({ videoUrl: e.target.value || '', url: e.target.value || '' })}
            placeholder="Video URL or upload file below"
            className={inputCls}
          />
          <div className="text-xs text-gray-500">
            For best checkpoint control, upload a video file. YouTube/Vimeo URLs work but with limited control.
          </div>
          <FileUpload
            onUploaded={(res: UploadResult) => {
              patch({
                fileId: res.fileId,
                url: res.fileUrl,
                videoUrl: res.fileUrl,
                fileName: res.fileName,
              });
            }}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Video Description / Notes for Students</label>
        <TextEditor
          value={String(data?.description || '')}
          onChange={(html: string) => patch({ description: html })}
          placeholder="Add context, key points, or instructions for students about this video..."
          height={200}
        />
        <p className="text-xs text-gray-500">Provide additional context, key takeaways, or viewing instructions for students</p>
      </div>

      {/* Checkpoints */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-medium text-gray-700">Video Checkpoints</label>
          <button
            type="button"
            onClick={() => {
              const newCheckpoint = {
                id: `cp-${Date.now()}`,
                timestamp: 0,
                questionText: '',
                question_text: '',
                questionType: 'multiple_choice',
                question_type: 'multiple_choice',
                options: [
                  { id: `opt-${Date.now()}-1`, text: '', isCorrect: false, is_correct: false },
                  { id: `opt-${Date.now()}-2`, text: '', isCorrect: false, is_correct: false },
                ],
                correctAnswer: '',
                correct_answer: '',
                feedback: '',
                points: 1,
              };
              patch({ checkpoints: [...(data?.checkpoints || []), newCheckpoint] });
            }}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Add Checkpoint
          </button>
        </div>

        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(data?.checkpoints || []).map((cp: any, cpIdx: number) => {
            const isCheckpointCollapsed = collapsedCheckpoints[cpIdx] ?? false;

            return (
              <div key={cp.id || cpIdx} className="border rounded-lg bg-gray-50 overflow-hidden">
                {/* Checkpoint header */}
                <div
                  className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleCheckpointCollapse(cpIdx)}
                >
                  <h4 className="text-sm font-medium text-gray-900">
                    Checkpoint {cpIdx + 1}
                    {cp.timestamp > 0 && (
                      <span className="ml-2 text-xs font-normal text-gray-500">@ {cp.timestamp}s</span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{isCheckpointCollapsed ? '\u25BC' : '\u25B2'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const checkpoints = [...(data?.checkpoints || [])];
                        checkpoints.splice(cpIdx, 1);
                        patch({ checkpoints });
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Checkpoint body */}
                {!isCheckpointCollapsed && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Timestamp */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Timestamp (seconds)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={cp.timestamp ?? 0}
                        onChange={(e) => updateCheckpoint(cpIdx, { timestamp: Number(e.target.value) || 0 })}
                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                        placeholder="0"
                      />
                    </div>

                    {/* Question Text */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Question Text</label>
                      <textarea
                        value={cp.questionText ?? cp.question_text ?? ''}
                        onChange={(e) =>
                          updateCheckpoint(cpIdx, {
                            questionText: e.target.value || '',
                            question_text: e.target.value || '',
                          })
                        }
                        rows={2}
                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                        placeholder="Enter your question here..."
                      />
                    </div>

                    {/* Question Type */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Question Type</label>
                      <select
                        value={cp.questionType ?? cp.question_type ?? 'multiple_choice'}
                        onChange={(e) =>
                          updateCheckpoint(cpIdx, {
                            questionType: e.target.value || 'multiple_choice',
                            question_type: e.target.value || 'multiple_choice',
                          })
                        }
                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                        <option value="short_answer">Short Answer</option>
                      </select>
                    </div>

                    {/* Multiple Choice Options */}
                    {(cp.questionType || cp.question_type) === 'multiple_choice' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-2">Options</label>
                        <div className="space-y-2">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(cp.options || []).map((opt: any, optIdx: number) => (
                            <div key={opt.id || optIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt.text ?? ''}
                                onChange={(e) => {
                                  const checkpoints = [...(data?.checkpoints || [])];
                                  const options = [...(checkpoints[cpIdx].options || [])];
                                  options[optIdx] = {
                                    ...options[optIdx],
                                    text: e.target.value || '',
                                    id: options[optIdx].id || `opt-${Date.now()}-${optIdx}`,
                                  };
                                  checkpoints[cpIdx] = { ...checkpoints[cpIdx], options };
                                  patch({ checkpoints });
                                }}
                                placeholder={`Option ${optIdx + 1}`}
                                className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700"
                              />
                              <label className="flex items-center gap-1 text-xs text-gray-600">
                                <input
                                  type="radio"
                                  name={`correct-${index}-${cp.id || cpIdx}`}
                                  checked={Boolean(opt.isCorrect || opt.is_correct)}
                                  onChange={() => {
                                    const checkpoints = [...(data?.checkpoints || [])];
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const options = (checkpoints[cpIdx].options || []).map((o: any, i: number) => ({
                                      ...o,
                                      isCorrect: i === optIdx,
                                      is_correct: i === optIdx,
                                    }));
                                    checkpoints[cpIdx] = {
                                      ...checkpoints[cpIdx],
                                      options,
                                      correctAnswer: options[optIdx]?.id,
                                      correct_answer: options[optIdx]?.id,
                                    };
                                    patch({ checkpoints });
                                  }}
                                  className="h-3 w-3"
                                />
                                Correct
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const checkpoints = [...(data?.checkpoints || [])];
                                  const options = [...(checkpoints[cpIdx].options || [])];
                                  options.splice(optIdx, 1);
                                  checkpoints[cpIdx] = { ...checkpoints[cpIdx], options };
                                  patch({ checkpoints });
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const checkpoints = [...(data?.checkpoints || [])];
                              const options = [...(checkpoints[cpIdx].options || [])];
                              options.push({
                                id: `opt-${Date.now()}`,
                                text: '',
                                isCorrect: false,
                                is_correct: false,
                              });
                              checkpoints[cpIdx] = { ...checkpoints[cpIdx], options };
                              patch({ checkpoints });
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            + Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    {/* True/False & Short Answer */}
                    {((cp.questionType || cp.question_type) === 'true_false' ||
                      (cp.questionType || cp.question_type) === 'short_answer') && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Correct Answer</label>
                        {(cp.questionType || cp.question_type) === 'true_false' ? (
                          <select
                            value={String(cp.correctAnswer ?? cp.correct_answer ?? '')}
                            onChange={(e) =>
                              updateCheckpoint(cpIdx, {
                                correctAnswer: e.target.value === 'true',
                                correct_answer: e.target.value === 'true',
                              })
                            }
                            className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                          >
                            <option value="">Select answer...</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={String(cp.correctAnswer ?? cp.correct_answer ?? '')}
                            onChange={(e) =>
                              updateCheckpoint(cpIdx, {
                                correctAnswer: e.target.value,
                                correct_answer: e.target.value,
                              })
                            }
                            placeholder="Enter correct answer"
                            className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                          />
                        )}
                      </div>
                    )}

                    {/* Feedback */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Feedback (optional)</label>
                      <textarea
                        value={cp.feedback ?? ''}
                        onChange={(e) => updateCheckpoint(cpIdx, { feedback: e.target.value || '' })}
                        rows={2}
                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                        placeholder="Feedback shown after answering..."
                      />
                    </div>

                    {/* Points */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Points</label>
                      <input
                        type="number"
                        min="0"
                        value={cp.points ?? 1}
                        onChange={(e) => updateCheckpoint(cpIdx, { points: Number(e.target.value) || 1 })}
                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {(!data?.checkpoints || data.checkpoints.length === 0) && (
            <div className="text-center py-4 text-sm text-gray-500">
              No checkpoints added yet. Click &quot;Add Checkpoint&quot; to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
