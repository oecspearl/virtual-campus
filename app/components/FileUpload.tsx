"use client";

import React from "react";

export type UploadResult = {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
};

export default function FileUpload({ onUploaded, maxSizeMB = 50, className = "" }: { onUploaded: (res: UploadResult) => void; maxSizeMB?: number; className?: string }) {
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const maxBytes = maxSizeMB * 1024 * 1024;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > maxBytes) {
      alert(`File too large. Max ${maxSizeMB}MB`);
      return;
    }
    const form = new FormData();
    form.set("file", file);
    setUploading(true);
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as UploadResult;
      onUploaded(data);
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-dashed ${dragOver ? "bg-blue-50" : "bg-white"} p-4 text-center ${className}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <button type="button" className="rounded-md border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <span>{uploading ? "Uploading…" : "Choose or Drop a file (max 50MB)"}</span>
      </button>
    </div>
  );
}
