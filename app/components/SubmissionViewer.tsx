"use client";

import React from "react";
import { sanitizeHtml } from '@/lib/sanitize';

export type Submission = {
  submission_type: "file" | "text" | "url";
  content: unknown;
  files?: { name: string; url: string; size: number }[];
};

export default function SubmissionViewer({ submission }: { submission: Submission }) {
  if (submission.submission_type === "text") {
    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(submission.content ?? "")) }} />;
  }
  if (submission.submission_type === "url") {
    return (
      <a href={String(submission.content ?? "#")} target="_blank" rel="noreferrer" className="text-sm text-[#3B82F6] underline">
        <span>Open submitted link</span>
      </a>
    );
  }
  // files
  // Handle files as either array or JSON string
  let filesArray: { name: string; url: string; size: number }[] = [];
  if (submission.files) {
    if (typeof submission.files === 'string') {
      try {
        filesArray = JSON.parse(submission.files);
      } catch (e) {
        console.error('Error parsing files:', e);
        filesArray = [];
      }
    } else if (Array.isArray(submission.files)) {
      filesArray = submission.files;
    }
  }

  return (
    <div className="space-y-2">
      {filesArray.length === 0 ? (
        <div className="text-sm text-gray-500">No files submitted</div>
      ) : (
        filesArray.map((f, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span className="text-gray-700">{f.name}</span>
            <a href={f.url} className="text-[#3B82F6] underline" target="_blank" rel="noreferrer">
              <span>Download</span>
            </a>
          </div>
        ))
      )}
    </div>
  );
}
