import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { withTenantAuth } from "@/lib/with-tenant-auth";

/**
 * POST /api/media/signed-url
 * Generates a signed upload URL for direct browser->Supabase uploads.
 * This bypasses the 4.5MB Vercel body size limit.
 *
 * Body: { fileName: string, contentType: string, fileSize: number }
 * Returns: { signedUrl: string, path: string, publicUrl: string }
 */
export const POST = withTenantAuth(async ({ user, request }) => {
  const body = await request.json();
  const { fileName, contentType, fileSize } = body;

  if (!fileName) {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }

  // File size limit (200MB)
  const maxBytes = 200 * 1024 * 1024;
  if (fileSize && fileSize > maxBytes) {
    return NextResponse.json({ error: "File too large. Maximum size is 200MB." }, { status: 413 });
  }

  const serviceSupabase = createServiceSupabaseClient();

  // Generate unique path
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const ext = fileName.split('.').pop() || 'bin';
  const storagePath = `uploads/${user.id}/${timestamp}-${randomString}.${ext}`;

  // Create signed upload URL (valid for 2 minutes)
  const { data, error } = await serviceSupabase.storage
    .from('course-materials')
    .createSignedUploadUrl(storagePath);

  if (error) {
    console.error('[Signed URL] Error creating signed URL:', error);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  // Get the public URL for after upload completes
  const { data: urlData } = serviceSupabase.storage
    .from('course-materials')
    .getPublicUrl(storagePath);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: storagePath,
    publicUrl: urlData.publicUrl,
  });
});
