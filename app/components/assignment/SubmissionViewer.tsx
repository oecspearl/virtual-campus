"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sanitizeHtml } from "@/lib/sanitize";

export interface SubmissionFile {
  name: string;
  url: string;
  size?: number;
  /** Optional MIME type if the API surfaces it; we still infer from extension. */
  type?: string;
}

export type Submission = {
  submission_type: 'file' | 'text' | 'url';
  content: unknown;
  /** files arrives as an array OR a JSON string; the viewer normalises both. */
  files?: SubmissionFile[] | string;
};

type PreviewKind =
  | 'image'
  | 'pdf'
  | 'video'
  | 'audio'
  | 'text'
  | 'office'
  | 'unknown';

const EXT_TO_KIND: Record<string, PreviewKind> = {
  // Images
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', avif: 'image',
  // PDFs
  pdf: 'pdf',
  // Video
  mp4: 'video', webm: 'video', ogg: 'video', mov: 'video',
  // Audio
  mp3: 'audio', wav: 'audio', m4a: 'audio', flac: 'audio', oga: 'audio',
  // Plain text we can fetch + render
  txt: 'text', md: 'text', csv: 'text', tsv: 'text', json: 'text', log: 'text',
  // Office — we can't render these inline without a third-party viewer; we
  // surface a "view in Google Docs" link as a best-effort.
  doc: 'office', docx: 'office', xls: 'office', xlsx: 'office', ppt: 'office', pptx: 'office',
};

function classifyFile(file: SubmissionFile): PreviewKind {
  const name = (file.name || '').toLowerCase();
  const ext = name.split('.').pop() || '';
  return EXT_TO_KIND[ext] || 'unknown';
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function iconFor(kind: PreviewKind): string {
  switch (kind) {
    case 'image': return 'mdi:image';
    case 'pdf': return 'mdi:file-pdf-box';
    case 'video': return 'mdi:video';
    case 'audio': return 'mdi:music-note';
    case 'text': return 'mdi:file-document-outline';
    case 'office': return 'mdi:file-word-box-outline';
    default: return 'mdi:file-outline';
  }
}

// ─── Per-type preview components ───────────────────────────────────────────

function ImagePreview({ file }: { file: SubmissionFile }) {
  return (
    <div className="rounded border border-gray-200 bg-gray-50 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={file.url}
        alt={file.name}
        className="block max-h-[600px] w-full object-contain mx-auto bg-white"
      />
    </div>
  );
}

function PdfPreview({ file }: { file: SubmissionFile }) {
  // Browsers ship a competent built-in PDF viewer; embedding via iframe
  // gets us inline rendering for free. We don't bring in react-pdf or
  // @react-pdf-viewer because they add ~250KB+ to the bundle for what
  // is a graders-only screen.
  return (
    <div className="rounded border border-gray-200 overflow-hidden bg-white">
      <iframe
        src={file.url}
        title={file.name}
        className="w-full"
        style={{ height: 'min(80vh, 720px)' }}
      />
    </div>
  );
}

function VideoPreview({ file }: { file: SubmissionFile }) {
  return (
    <video
      controls
      preload="metadata"
      className="w-full max-h-[600px] rounded border border-gray-200 bg-black"
    >
      <source src={file.url} />
      Your browser does not support inline video playback.
    </video>
  );
}

function AudioPreview({ file }: { file: SubmissionFile }) {
  return (
    <audio controls preload="metadata" className="w-full">
      <source src={file.url} />
      Your browser does not support inline audio playback.
    </audio>
  );
}

const TEXT_PREVIEW_BYTE_CAP = 200_000; // 200 KB — never load larger files

function TextPreview({ file }: { file: SubmissionFile }) {
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBody(null);
    setError(null);
    setTruncated(false);

    if (file.size && file.size > TEXT_PREVIEW_BYTE_CAP) {
      setError('File too large for inline preview');
      return;
    }

    (async () => {
      try {
        const res = await fetch(file.url);
        if (!res.ok) {
          if (!cancelled) setError(`Couldn't load file (${res.status})`);
          return;
        }
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const limit = Math.min(buf.byteLength, TEXT_PREVIEW_BYTE_CAP);
        const text = new TextDecoder('utf-8', { fatal: false }).decode(
          buf.slice(0, limit)
        );
        setBody(text);
        if (buf.byteLength > limit) setTruncated(true);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Couldn't load file"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file.url, file.size]);

  if (error) {
    return (
      <div className="text-xs text-gray-500 italic px-3 py-2 border border-gray-200 rounded">
        {error}. <a href={file.url} target="_blank" rel="noreferrer" className="underline text-blue-600">Open file</a>
      </div>
    );
  }

  if (body === null) {
    return (
      <div className="text-xs text-gray-400 italic">Loading preview…</div>
    );
  }

  return (
    <div className="space-y-1">
      <pre className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs overflow-x-auto max-h-[480px] font-mono whitespace-pre-wrap break-words">
        {body}
      </pre>
      {truncated && (
        <div className="text-[11px] text-amber-600">
          Preview truncated — file exceeds {formatBytes(TEXT_PREVIEW_BYTE_CAP)}.{' '}
          <a href={file.url} className="underline text-blue-600" target="_blank" rel="noreferrer">
            Open full file
          </a>
        </div>
      )}
    </div>
  );
}

function OfficePreview({ file }: { file: SubmissionFile }) {
  // Office docs can't render inline without a third-party viewer.
  // Google Docs's public viewer can render docx/xlsx/pptx if the file
  // URL is publicly reachable. We surface that as a "preview" CTA;
  // graders without the URL public can still download.
  const gdocsUrl = `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(
    file.url
  )}`;
  return (
    <div className="space-y-2">
      <iframe
        src={gdocsUrl}
        title={file.name}
        className="w-full rounded border border-gray-200 bg-white"
        style={{ height: 'min(80vh, 720px)' }}
      />
      <p className="text-[11px] text-gray-500">
        Office docs preview via Google Docs viewer; requires the file URL to be
        publicly accessible. If the preview is blank,{' '}
        <a href={file.url} className="underline text-blue-600" target="_blank" rel="noreferrer">
          download the file
        </a>{' '}
        instead.
      </p>
    </div>
  );
}

function FilePreview({ file }: { file: SubmissionFile }) {
  const kind = classifyFile(file);
  switch (kind) {
    case 'image': return <ImagePreview file={file} />;
    case 'pdf': return <PdfPreview file={file} />;
    case 'video': return <VideoPreview file={file} />;
    case 'audio': return <AudioPreview file={file} />;
    case 'text': return <TextPreview file={file} />;
    case 'office': return <OfficePreview file={file} />;
    default:
      return (
        <div className="text-sm text-gray-500 px-3 py-4 border border-dashed border-gray-200 rounded text-center">
          No inline preview for this file type.{' '}
          <a href={file.url} className="underline text-blue-600" target="_blank" rel="noreferrer">
            Open or download
          </a>
        </div>
      );
  }
}

// ─── Main component ────────────────────────────────────────────────────────

export default function SubmissionViewer({ submission }: { submission: Submission }) {
  const filesArray = useMemo<SubmissionFile[]>(() => {
    if (!submission.files) return [];
    if (Array.isArray(submission.files)) return submission.files;
    if (typeof submission.files === 'string') {
      try {
        const parsed = JSON.parse(submission.files);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Error parsing files:', e);
        return [];
      }
    }
    return [];
  }, [submission.files]);

  const [activeFileIdx, setActiveFileIdx] = useState(0);

  // Reset active file when submission changes.
  useEffect(() => {
    setActiveFileIdx(0);
  }, [submission]);

  if (submission.submission_type === 'text') {
    const html = sanitizeHtml(String(submission.content ?? ''));
    return (
      <div className="prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  if (submission.submission_type === 'url') {
    const url = String(submission.content ?? '');
    if (!url) {
      return <div className="text-sm text-gray-500">No URL submitted</div>;
    }
    let host = url;
    try {
      host = new URL(url).host;
    } catch {
      // ignore
    }
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Icon icon="mdi:link-variant" className="w-4 h-4 text-gray-500" aria-hidden="true" />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline break-all"
          >
            {url}
          </a>
        </div>
        <div className="text-[11px] text-gray-500">
          Opens {host} in a new tab. URL submissions are not previewed inline.
        </div>
      </div>
    );
  }

  // ─── File submission(s) ────────────────────────────────────────────────

  if (filesArray.length === 0) {
    return <div className="text-sm text-gray-500">No files submitted</div>;
  }

  const active = filesArray[Math.min(activeFileIdx, filesArray.length - 1)];

  return (
    <div className="space-y-3">
      {/* Tab strip — only when there's more than one file */}
      {filesArray.length > 1 && (
        <div
          className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1"
          role="tablist"
          aria-label="Submitted files"
        >
          {filesArray.map((f, i) => {
            const kind = classifyFile(f);
            const selected = i === activeFileIdx;
            return (
              <button
                key={`${f.name}-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveFileIdx(i)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
                  selected
                    ? 'bg-slate-800 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon icon={iconFor(kind)} className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="max-w-[180px] truncate">{f.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active file header + preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2 min-w-0">
            <Icon icon={iconFor(classifyFile(active))} className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <span className="truncate font-medium text-gray-800">{active.name}</span>
            {active.size !== undefined && (
              <span className="text-gray-400 shrink-0">{formatBytes(active.size)}</span>
            )}
          </div>
          <a
            href={active.url}
            download={active.name}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            <Icon icon="mdi:download" className="w-3.5 h-3.5" aria-hidden="true" />
            Download
          </a>
        </div>
        <FilePreview file={active} />
      </div>
    </div>
  );
}
