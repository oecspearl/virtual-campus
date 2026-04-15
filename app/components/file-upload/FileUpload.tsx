"use client";

import React from "react";

export type UploadResult = {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
};

// Files under this size use the /api/media/upload proxy.
// Files over this size use direct-to-Supabase signed URL uploads
// to bypass Vercel's 4.5MB body size limit.
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4MB

export default function FileUpload({ onUploaded, maxSizeMB = 50, className = "" }: { onUploaded: (res: UploadResult) => void; maxSizeMB?: number; className?: string }) {
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const maxBytes = maxSizeMB * 1024 * 1024;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > maxBytes) {
      alert(`File too large. Max ${maxSizeMB}MB`);
      return;
    }
    setUploading(true);
    setProgress(0);

    try {
      if (file.size > DIRECT_UPLOAD_THRESHOLD) {
        // Large file: use signed URL for direct upload to Supabase
        await uploadDirect(file);
      } else {
        // Small file: use the API proxy
        await uploadViaProxy(file);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Small files: POST to /api/media/upload
  const uploadViaProxy = async (file: File) => {
    const form = new FormData();
    form.set("file", file);
    setProgress(30);
    const res = await fetch("/api/media/upload", { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }
    setProgress(100);
    const data = (await res.json()) as UploadResult;
    onUploaded(data);
  };

  // Large files: get signed URL, upload directly to Supabase Storage
  const uploadDirect = async (file: File) => {
    // Step 1: Get signed URL from our API
    setProgress(10);
    const signedRes = await fetch("/api/media/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!signedRes.ok) {
      const err = await signedRes.json().catch(() => ({}));
      throw new Error(err.error || "Failed to get upload URL");
    }

    const { signedUrl, token, path, publicUrl } = await signedRes.json();

    // Step 2: Upload directly to Supabase using XHR for progress tracking
    setProgress(20);
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(20 + Math.round((e.loaded / e.total) * 75));
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Upload failed")));
      xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      if (token) {
        xhr.setRequestHeader("x-upsert", "false");
      }
      xhr.send(file);
    });

    setProgress(100);

    // Step 3: Return the result
    onUploaded({
      fileId: path,
      fileName: file.name,
      fileUrl: publicUrl,
      fileSize: file.size,
      fileType: file.type,
    });
  };

  const label = uploading
    ? progress > 0 ? `Uploading… ${progress}%` : "Uploading…"
    : `Choose or drop a file (max ${maxSizeMB}MB)`;

  return (
    <div
      className={`relative rounded-lg border border-dashed transition-colors ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white"} p-4 text-center ${className}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <button
        type="button"
        className="rounded-md border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {label}
      </button>
      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
