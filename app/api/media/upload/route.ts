import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { withTenantAuth } from "@/lib/with-tenant-auth";

// Increase body size limit for file uploads (default is 4.5MB)
export const maxDuration = 60;

export const POST = withTenantAuth(async ({ user, request }) => {
  console.log('[Media Upload] Starting upload request...');
  console.log('[Media Upload] User authenticated:', user.id);

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  console.log('[Media Upload] File received:', { name: file.name, size: file.size, type: file.type });

  // File size limit (50MB)
  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 413 });
  }

  // MIME type validation — only allow known safe content types.
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Video
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
    // Documents
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    // Archives (for SCORM packages)
    'application/zip', 'application/x-zip-compressed',
    // Text
    'text/plain', 'text/csv', 'text/html', 'text/rtf',
    // Captions / subtitles
    'text/vtt', 'application/x-subrip',
    // 3D models (lesson 3D model block)
    'model/gltf-binary', 'model/gltf+json', 'model/vnd.usdz+zip',
  ];

  // Browsers (especially on Windows + when the file was emailed/zipped)
  // frequently report Office docs, PDFs, and 3D models as
  // application/octet-stream or an empty string. Accept those when the
  // extension confirms a known-safe type, and substitute the real MIME
  // type for storage so we don't persist "application/octet-stream".
  const EXTENSION_FALLBACKS: Record<string, string> = {
    pdf:  'application/pdf',
    doc:  'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls:  'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt:  'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    rtf:  'application/rtf',
    txt:  'text/plain',
    csv:  'text/csv',
    vtt:  'text/vtt',
    srt:  'application/x-subrip',
    zip:  'application/zip',
    glb:  'model/gltf-binary',
    gltf: 'model/gltf+json',
    usdz: 'model/vnd.usdz+zip',
  };

  const fileExtension = (file.name.split('.').pop() || '').toLowerCase();
  const isOpaqueType = file.type === 'application/octet-stream' || file.type === '';
  const fallbackType = isOpaqueType ? EXTENSION_FALLBACKS[fileExtension] : undefined;

  const accepted = allowedMimeTypes.includes(file.type) || !!fallbackType;
  if (!accepted) {
    return NextResponse.json({ error: `File type '${file.type}' is not allowed.` }, { status: 415 });
  }

  // Use the resolved type from here on (file.type is read-only, so we keep
  // a separate variable that storage + the metadata row both use).
  const effectiveContentType = fallbackType ?? file.type;

  // Validate file extension matches MIME type (prevent extension spoofing)
  const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'msi', 'dll', 'scr', 'com', 'pif'];
  if (dangerousExtensions.includes(fileExtension)) {
    return NextResponse.json({ error: "This file type is not allowed for security reasons." }, { status: 415 });
  }

  // Use service client for storage operations to bypass RLS
  const serviceSupabase = createServiceSupabaseClient();

  // Generate unique filename with user folder for organization
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const safeExtension = fileExtension || 'bin';
  const fileName = `uploads/${user.id}/${timestamp}-${randomString}.${safeExtension}`;
  console.log('[Media Upload] Generated filename:', fileName);

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = new Uint8Array(arrayBuffer);

  // Upload file to Supabase Storage
  const { data: uploadData, error: uploadError } = await serviceSupabase.storage
    .from('course-materials')
    .upload(fileName, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: effectiveContentType,
    });

  if (uploadError) {
    console.error('[Media Upload] Supabase storage upload error:', uploadError);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
  console.log('[Media Upload] File uploaded to storage:', uploadData);

  // Get public URL
  const { data: urlData } = serviceSupabase.storage
    .from('course-materials')
    .getPublicUrl(fileName);
  console.log('[Media Upload] Public URL generated:', urlData.publicUrl);

  // Store file metadata in database using service client to bypass RLS
  const { data: fileRecord, error: dbError } = await serviceSupabase
    .from('files')
    .insert([{
      name: file.name,
      type: effectiveContentType,
      size: file.size,
      url: urlData.publicUrl,
      uploaded_by: user.id,
    }])
    .select()
    .single();

  if (dbError) {
    console.error('[Media Upload] Database insert error:', dbError);
    // Try to clean up uploaded file
    await serviceSupabase.storage.from('course-materials').remove([fileName]);
    return NextResponse.json({ error: "Failed to save file metadata" }, { status: 500 });
  }
  console.log('[Media Upload] File record created:', fileRecord.id);

  return NextResponse.json({
    fileId: fileRecord.id,
    fileName: file.name,
    fileUrl: urlData.publicUrl,
    fileSize: file.size,
    fileType: effectiveContentType,
  });
});
