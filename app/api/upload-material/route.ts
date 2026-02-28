import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // File size limit (50MB)
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 413 });
    }

    const supabase = await createServerSupabaseClient();

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `assignment-submissions/${timestamp}-${randomString}.${fileExtension}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-materials')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ 
        error: "File upload failed",
        details: uploadError.message || 'Unknown upload error'
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('course-materials')
      .getPublicUrl(fileName);

    // Store file metadata in database
    const { data: fileRecord, error: dbError } = await supabase
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
      console.error('Database insert error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('course-materials').remove([fileName]);
      return NextResponse.json({ error: "Failed to save file metadata" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type
      }
    });

  } catch (e: any) {
    console.error('File upload error:', e);
    return NextResponse.json({ 
      error: "Internal server error",
      details: e?.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}
