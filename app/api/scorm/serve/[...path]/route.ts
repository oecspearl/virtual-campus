import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

// Proxy SCORM package files through our domain so the iframe is same-origin.
// This allows the SCORM content to access window.parent.API for the runtime.
//
// URL pattern: /api/scorm/serve/scorm-packages/123-abc/index.html
// Catch-all route so relative paths inside SCORM HTML files resolve correctly.
// e.g. if index.html has <script src="./lib/api.js">, the browser requests
// /api/scorm/serve/scorm-packages/123-abc/lib/api.js — which this route handles.

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.xsd': 'application/xml',
  '.dtd': 'application/xml-dtd',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.swf': 'application/x-shockwave-flash',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
};

function getMimeType(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const storagePath = pathSegments.join('/');

  // Security: only allow scorm-packages/ prefix
  if (!storagePath.startsWith('scorm-packages/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  // Prevent path traversal
  if (storagePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();

    const { data, error } = await serviceSupabase.storage
      .from('course-materials')
      .download(storagePath);

    if (error || !data) {
      // Try without leading segment in case of path mismatch
      console.error('[SCORM Serve] File not found:', storagePath, error?.message);
      return new NextResponse('Not Found', { status: 404 });
    }

    const contentType = getMimeType(storagePath);
    const arrayBuffer = await data.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('[SCORM Serve] Error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
