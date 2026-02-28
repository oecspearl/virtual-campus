import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fileId = id;
    
    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get file metadata from database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (dbError || !fileRecord) {
      console.error('File not found:', dbError);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Get the file from Supabase Storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('course-materials')
      .download(fileRecord.url.split('/').pop() || '');

    if (storageError || !fileData) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Return the file with appropriate headers
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': fileRecord.type,
        'Content-Length': fileRecord.size.toString(),
        'Content-Disposition': `inline; filename="${fileRecord.name}"`,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
