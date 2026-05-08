import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { withTenantAuth } from "@/lib/with-tenant-auth";

const BUCKET = 'course-materials';
const MAX_BYTES = 50 * 1024 * 1024;

/**
 * Sanitise a filename for use as a storage key. Storage refuses
 * characters outside `[A-Za-z0-9!\-_*'()]`; collapsing to underscores
 * keeps the original name visible while staying valid.
 */
function safeStorageName(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot >= 0 ? name.slice(lastDot + 1).replace(/[^A-Za-z0-9]/g, '') : '';
  const stem = (lastDot >= 0 ? name.slice(0, lastDot) : name)
    .replace(/[^A-Za-z0-9-_.]/g, '_')
    .slice(0, 80);
  return ext ? `${stem}.${ext}` : stem;
}

export const POST = withTenantAuth(async ({ user, tenantId, request }) => {
  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 }
    );
  }

  // Use the service client for storage + DB writes. The previous
  // implementation used the user's cookie-authenticated client, which
  // is subject to bucket-level RLS — students don't typically have
  // insert privileges on `course-materials`, so every upload 500'd.
  // Identity is already established by withTenantAuth (user.id below);
  // we record it on the row so attribution and the /api/files/[id]
  // ownership check still work correctly.
  const supabase = createServiceSupabaseClient();

  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const safeName = safeStorageName(file.name);
  const storagePath = `assignment-submissions/${timestamp}-${randomString}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    console.error('[upload-material] Storage upload failed:', {
      message: uploadError.message,
      path: storagePath,
      size: file.size,
      type: file.type,
      userId: user.id,
    });
    return NextResponse.json(
      {
        error: 'File upload failed',
        details: uploadError.message,
      },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const { data: fileRecord, error: dbError } = await supabase
    .from('files')
    .insert([
      {
        tenant_id: tenantId,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        url: urlData.publicUrl,
        uploaded_by: user.id,
      },
    ])
    .select()
    .single();

  if (dbError) {
    console.error('[upload-material] Database insert failed:', {
      message: dbError.message,
      code: dbError.code,
      details: dbError.details,
    });
    // Best-effort cleanup of the orphaned blob.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: 'Failed to save file metadata', details: dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    file: {
      id: fileRecord.id,
      name: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
    },
  });
});
