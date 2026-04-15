"use client";

import { sanitizeHtml } from "@/lib/sanitize";

export default function RichText({ html }: { html: string }) {
  return (
    <div className="prose prose-sm max-w-none rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
  );
}
