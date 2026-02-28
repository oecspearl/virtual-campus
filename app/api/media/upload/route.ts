import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

export async function POST(request: Request) {
  try {
    console.log('[Media Upload] Starting upload request...');

    const user = await getCurrentUser();
    if (!user) {
      console.log('[Media Upload] No authenticated user found');
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
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

    // Use service client for storage operations to bypass RLS
    const serviceSupabase = createServiceSupabaseClient();

    // Generate unique filename with user folder for organization
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `uploads/${user.id}/${timestamp}-${randomString}.${fileExtension}`;
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
        contentType: file.type
      });

    if (uploadError) {
      console.error('[Media Upload] Supabase storage upload error:', uploadError);
      return NextResponse.json({
        error: "File upload failed",
        details: uploadError.message
      }, { status: 500 });
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
        type: file.type,
        size: file.size,
        url: urlData.publicUrl,
        uploaded_by: user.id
      }])
      .select()
      .single();

    if (dbError) {
      console.error('[Media Upload] Database insert error:', dbError);
      // Try to clean up uploaded file
      await serviceSupabase.storage.from('course-materials').remove([fileName]);
      return NextResponse.json({
        error: "Failed to save file metadata",
        details: dbError.message
      }, { status: 500 });
    }
    console.log('[Media Upload] File record created:', fileRecord.id);

    return NextResponse.json({
      fileId: fileRecord.id,
      fileName: file.name,
      fileUrl: urlData.publicUrl,
      fileSize: file.size,
      fileType: file.type
    });

  } catch (e: any) {
    console.error('[Media Upload] Unexpected error:', e);
    return NextResponse.json({
      error: "Internal server error",
      details: e.message
    }, { status: 500 });
  }
}
