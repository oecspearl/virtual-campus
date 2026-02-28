import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const submissionId = url.searchParams.get('submission');
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // If submissionId is provided, get files for that submission
    if (submissionId) {
      const { data: submission, error: submissionError } = await supabase
        .from('assignment_submissions')
        .select('files, student_id, assignment_id')
        .eq('id', submissionId)
        .single();

      if (submissionError || !submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      // Check if user can access this submission
      const isStudentOwner = submission.student_id === user.id;
      const isAdmin = user.role && ['admin', 'super_admin'].includes(user.role);
      
      // Check if user is instructor for this assignment
      let isInstructor = false;
      if (submission.assignment_id) {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('creator_id, lesson_id')
          .eq('id', submission.assignment_id)
          .single();
        
        if (assignment?.creator_id === user.id) isInstructor = true;
        
        if (assignment?.lesson_id) {
          const { data: lesson } = await supabase
            .from('lessons')
            .select('course_id')
            .eq('id', assignment.lesson_id)
            .single();
          
          if (lesson?.course_id) {
            const { data: instructorCheck } = await supabase
              .from('course_instructors')
              .select('id')
              .eq('course_id', lesson.course_id)
              .eq('instructor_id', user.id)
              .single();
            
            isInstructor = !!instructorCheck;
          }
        }
      }

      if (!isStudentOwner && !isAdmin && !isInstructor) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Parse files from JSON and update URLs to point to actual file storage
      let filesArray = [];
      if (submission.files) {
        try {
          filesArray = typeof submission.files === 'string' 
            ? JSON.parse(submission.files) 
            : submission.files;
            
          // Update URLs to be downloadable
          if (Array.isArray(filesArray)) {
            filesArray = filesArray.map((file: any, index: number) => ({
              ...file,
              url: `/api/files/${submissionId}/${index}` // Use submission ID and file index
            }));
          }
        } catch (e) {
          console.error('Error parsing files:', e);
        }
      }

      return NextResponse.json({ files: Array.isArray(filesArray) ? filesArray : [] });
    }

    // Return info about the endpoint
    return NextResponse.json({ 
      message: "File API endpoint",
      usage: "Use ?submission=submission-id to get files for a submission"
    });

  } catch (error) {
    console.error('Files API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const form = await request.formData();
    const files = form.getAll("files") as File[];
    const file = form.get("file") as File | null;
    const courseId = form.get("course_id") as string | null;
    const lessonId = form.get("lesson_id") as string | null;
    const folder = form.get("folder") as string | null;

    // Support both single file and multiple files
    const filesToUpload = files.length > 0 ? files : (file ? [file] : []);

    if (filesToUpload.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // File size limit (50MB per file)
    const maxBytes = 50 * 1024 * 1024;
    for (const f of filesToUpload) {
      if (f.size > maxBytes) {
        return NextResponse.json({
          error: `File "${f.name}" is too large. Maximum size is 50MB.`
        }, { status: 413 });
      }
    }

    const supabase = await createServerSupabaseClient();
    const uploadedFiles = [];
    const errors = [];

    for (const fileToUpload of filesToUpload) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = fileToUpload.name.split('.').pop() || 'bin';
        const sanitizedName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Determine folder path
        let folderPath = folder || 'uploads';
        if (lessonId) {
          folderPath = `lessons/${lessonId}`;
        } else if (courseId) {
          folderPath = `courses/${courseId}`;
        }

        const fileName = `${folderPath}/${timestamp}-${randomString}-${sanitizedName}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('course-materials')
          .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          errors.push({ name: fileToUpload.name, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('course-materials')
          .getPublicUrl(fileName);

        // Store file metadata in database
        const { data: fileRecord, error: dbError } = await supabase
          .from('files')
          .insert([{
            name: fileToUpload.name,
            type: fileToUpload.type || 'application/octet-stream',
            size: fileToUpload.size,
            url: urlData.publicUrl,
            uploaded_by: user.id,
            course_id: courseId || null,
            lesson_id: lessonId || null
          }])
          .select()
          .single();

        if (dbError) {
          // Try to clean up uploaded file
          await supabase.storage.from('course-materials').remove([fileName]);
          errors.push({ name: fileToUpload.name, error: 'Failed to save file metadata' });
          continue;
        }

        uploadedFiles.push({
          id: fileRecord.id,
          name: fileToUpload.name,
          url: urlData.publicUrl,
          size: fileToUpload.size,
          type: fileToUpload.type
        });
      } catch (err: any) {
        errors.push({ name: fileToUpload.name, error: err?.message || 'Upload failed' });
      }
    }

    if (uploadedFiles.length === 0 && errors.length > 0) {
      return NextResponse.json({
        error: "All file uploads failed",
        details: errors
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Internal server error",
      details: error?.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}

