"use client";

import React from "react";

export type UploadedFile = { name: string; url: string; size: number; fileId?: string };

export default function FileUploadZone({ onUploaded, maxSizeMB = 50, multiple = true }: { onUploaded: (files: UploadedFile[]) => void; maxSizeMB?: number; multiple?: boolean }) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList) {
    const out: UploadedFile[] = [];
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          // skip oversized
          continue;
        }
        const form = new FormData();
        form.set("file", file);
        const res = await fetch("/api/upload-material", { method: "POST", body: form });
        if (!res.ok) continue;
        const data = await res.json();
        // Use the file's public URL from Supabase storage directly
        const fileUrl = data.file?.url || `/api/files/${encodeURIComponent(String(data.file?.id ?? ""))}`;
        out.push({ name: file.name, url: fileUrl, size: file.size, fileId: data.file?.id });
      }
      if (out.length) onUploaded(out);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      }}
    >
      <p className="mb-2">Drag &amp; drop files here, or</p>
      <button type="button" className="rounded-md bg-[#3B82F6] px-3 py-1.5 text-white" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <span>{uploading ? "Uploading…" : "Choose file(s)"}</span>
      </button>
      <input ref={inputRef} type="file" className="hidden" multiple={multiple} onChange={(e) => e.target.files && handleFiles(e.target.files)} />
    </div>
  );
}
