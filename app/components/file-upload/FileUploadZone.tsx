"use client";

import React, { useRef, useState } from "react";
import { Icon } from "@iconify/react";

export type UploadedFile = {
  name: string;
  url: string;
  size: number;
  fileId?: string;
};

type ProgressEntry =
  | { status: 'uploading'; name: string; size: number }
  | { status: 'error'; name: string; size: number; error: string };

interface FileUploadZoneProps {
  onUploaded: (files: UploadedFile[]) => void;
  maxSizeMB?: number;
  multiple?: boolean;
  accept?: string;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default function FileUploadZone({
  onUploaded,
  maxSizeMB = 50,
  multiple = true,
  accept,
}: FileUploadZoneProps) {
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploading = progress.some((p) => p.status === 'uploading');

  const dismissError = (idx: number) =>
    setProgress((prev) => prev.filter((_, i) => i !== idx));

  async function handleFiles(files: FileList) {
    const fileList = Array.from(files);
    const succeeded: UploadedFile[] = [];

    for (const file of fileList) {
      // Show the file immediately so the user sees something happening,
      // including for failures that resolve before any network round-trip.
      const startMarker: ProgressEntry = {
        status: 'uploading',
        name: file.name,
        size: file.size,
      };
      setProgress((prev) => [...prev, startMarker]);

      const removeMarker = () =>
        setProgress((prev) => {
          const idx = prev.findIndex(
            (p) =>
              p.status === 'uploading' &&
              p.name === file.name &&
              p.size === file.size
          );
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });

      const replaceWithError = (error: string) =>
        setProgress((prev) => {
          const idx = prev.findIndex(
            (p) =>
              p.status === 'uploading' &&
              p.name === file.name &&
              p.size === file.size
          );
          const errorEntry: ProgressEntry = {
            status: 'error',
            name: file.name,
            size: file.size,
            error,
          };
          if (idx === -1) return [...prev, errorEntry];
          return [
            ...prev.slice(0, idx),
            errorEntry,
            ...prev.slice(idx + 1),
          ];
        });

      if (file.size > maxSizeMB * 1024 * 1024) {
        replaceWithError(`File too large (limit ${maxSizeMB} MB)`);
        continue;
      }

      try {
        const form = new FormData();
        form.set('file', file);
        const res = await fetch('/api/upload-material', {
          method: 'POST',
          body: form,
        });

        if (!res.ok) {
          let msg = `Upload failed (${res.status})`;
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {
            /* ignore */
          }
          replaceWithError(msg);
          continue;
        }

        const data = await res.json().catch(() => null);
        const url = data?.file?.url ?? null;
        const id = data?.file?.id ?? null;
        if (!url && !id) {
          replaceWithError('Upload succeeded but no file reference returned');
          continue;
        }

        // Prefer the auth-gated proxy; fall back to the storage URL only
        // when no id is available. The grader/student renderers do the
        // same so behaviour is consistent across views.
        const effectiveUrl = id
          ? `/api/files/${encodeURIComponent(String(id))}`
          : url;

        succeeded.push({
          name: file.name,
          url: effectiveUrl,
          size: file.size,
          fileId: id ?? undefined,
        });
        removeMarker();
      } catch (e) {
        replaceWithError(
          e instanceof Error ? e.message : 'Network error during upload'
        );
      }
    }

    if (succeeded.length > 0) onUploaded(succeeded);
  }

  return (
    <div className="space-y-2">
      <div
        className={`rounded-md border-2 border-dashed p-4 text-center text-sm transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-gray-300 text-gray-600'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
      >
        <Icon
          icon="mdi:cloud-upload-outline"
          className="w-8 h-8 mx-auto text-gray-400 mb-1"
          aria-hidden="true"
        />
        <p className="mb-2">Drag &amp; drop files here, or</p>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Choose file(s)'}
        </button>
        <p className="text-[11px] text-gray-400 mt-2">
          Max {maxSizeMB} MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            // Allow re-selecting the same file after a failure.
            e.target.value = '';
          }}
        />
      </div>

      {/* Progress + errors. Successful uploads disappear from this list
          once the parent has them in state via onUploaded. */}
      {progress.length > 0 && (
        <ul className="space-y-1.5">
          {progress.map((entry, idx) => (
            <li
              key={`${entry.name}-${idx}`}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded text-sm border ${
                entry.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {entry.status === 'uploading' ? (
                  <Icon
                    icon="mdi:loading"
                    className="w-4 h-4 text-blue-500 animate-spin shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Icon
                    icon="mdi:alert-circle"
                    className="w-4 h-4 text-red-500 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate text-gray-800">{entry.name}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatBytes(entry.size)}
                </span>
              </div>
              {entry.status === 'error' && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-red-700">{entry.error}</span>
                  <button
                    type="button"
                    onClick={() => dismissError(idx)}
                    aria-label="Dismiss"
                    className="text-red-400 hover:text-red-700"
                  >
                    <Icon icon="mdi:close" className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
