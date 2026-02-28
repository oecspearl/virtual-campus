import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import JSZip from "jszip";
import { createHash } from "crypto";

export const maxDuration = 300; // 5 minutes for Vercel Pro

// Constants for limits (risk mitigation)
const MAX_FILES = 100;
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB

interface FileReference {
  fileId: string;
  url: string;
  name: string;
  type: string;
  size: number;
  hash?: string;
}

/**
 * Extract all file references from lesson content and resources
 */
function extractFileReferences(content: any[], resources: any[]): FileReference[] {
  const fileRefs: FileReference[] = [];
  const seen = new Set<string>();

  const processItem = (item: any) => {
    if (!item || !item.data) return;

    // Handle different content types that may have files
    const contentTypesWithFiles = [
      'video', 'audio', 'image', 'file', 'pdf', 
      'interactive_video', 'code_sandbox'
    ];

    if (contentTypesWithFiles.includes(item.type)) {
      const fileId = item.data?.fileId || item.data?.file_id;
      const url = item.data?.url;
      const name = item.data?.name || item.data?.fileName || 'unknown';
      const type = item.data?.type || 'application/octet-stream';
      const size = item.data?.size || 0;

      if (fileId && !seen.has(fileId)) {
        seen.add(fileId);
        fileRefs.push({ fileId, url, name, type, size });
      } else if (url && url.startsWith('/api/files/') && !seen.has(url)) {
        // Extract fileId from URL like /api/files/{fileId}
        const match = url.match(/\/api\/files\/([^/?]+)/);
        if (match && !seen.has(match[1])) {
          seen.add(match[1]);
          fileRefs.push({ fileId: match[1], url, name, type, size });
        }
      }
    }
  };

  // Process content items
  if (Array.isArray(content)) {
    content.forEach(processItem);
  }

  // Process resource items
  if (Array.isArray(resources)) {
    resources.forEach(processItem);
  }

  return fileRefs;
}

/**
 * Download file from Supabase Storage and calculate hash
 */
async function downloadFile(
  supabase: any,
  fileId: string,
  url: string
): Promise<{ buffer: Buffer; hash: string } | null> {
  try {
    // Try to get file from storage using the fileId or URL
    let fileData: Blob | null = null;

    // Extract filename from URL if it's a Supabase Storage URL
    const storageUrlMatch = url.match(/\/storage\/v1\/object\/public\/course-materials\/(.+)/);
    if (storageUrlMatch) {
      const fileName = storageUrlMatch[1];
      const { data, error } = await supabase.storage
        .from('course-materials')
        .download(fileName);

      if (error || !data) {
        console.error(`Failed to download file ${fileId}:`, error);
        return null;
      }
      fileData = data;
    } else {
      // Try to fetch file metadata from database
      const { data: fileRecord } = await supabase
        .from('files')
        .select('url, name')
        .eq('id', fileId)
        .single();

      if (fileRecord?.url) {
        const storageUrlMatch = fileRecord.url.match(/\/storage\/v1\/object\/public\/course-materials\/(.+)/);
        if (storageUrlMatch) {
          const fileName = storageUrlMatch[1];
          const { data, error } = await supabase.storage
            .from('course-materials')
            .download(fileName);

          if (error || !data) {
            console.error(`Failed to download file ${fileId}:`, error);
            return null;
          }
          fileData = data;
        }
      }
    }

    if (!fileData) {
      return null;
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate SHA256 hash for deduplication
    const hash = createHash('sha256').update(buffer).digest('hex');

    return { buffer, hash };
  } catch (error) {
    console.error(`Error downloading file ${fileId}:`, error);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Check if user data should be included (admin/super_admin only)
    const includeUserData = searchParams.get('include_user_data') === 'true';

    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    // Check permissions - only instructors, admins can backup
    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // User data backups require admin/super_admin
    if (includeUserData && !hasRole(userProfile.role, ["admin", "super_admin"])) {
      return NextResponse.json({ 
        error: "Only administrators can backup user data. Remove 'include_user_data=true' parameter." 
      }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Fetch course data
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if user is course instructor (unless admin)
    if (!hasRole(userProfile.role, ["admin", "super_admin"])) {
      const { data: instructorCheck } = await supabase
        .from('course_instructors')
        .select('id')
        .eq('course_id', courseId)
        .eq('instructor_id', authResult.user.id)
        .single();

      if (!instructorCheck) {
        return NextResponse.json({ error: "You can only backup courses you instruct" }, { status: 403 });
      }
    }

    // Fetch course instructors
    const { data: instructors } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', courseId);

    // Fetch all lessons for this course
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
    }

    // Extract all file references from lessons
    const allFileRefs: FileReference[] = [];
    const fileRefsMap = new Map<string, FileReference>();

    (lessons || []).forEach((lesson: any) => {
      const content = lesson.content || [];
      const resources = lesson.resources || [];
      const refs = extractFileReferences(content, resources);

      refs.forEach(ref => {
        if (!fileRefsMap.has(ref.fileId)) {
          fileRefsMap.set(ref.fileId, ref);
          allFileRefs.push(ref);
        }
      });
    });

    // Add course thumbnail if exists
    if (course.thumbnail) {
      const thumbnailMatch = course.thumbnail.match(/\/api\/files\/([^/?]+)/);
      if (thumbnailMatch) {
        const thumbnailFileId = thumbnailMatch[1];
        if (!fileRefsMap.has(thumbnailFileId)) {
          fileRefsMap.set(thumbnailFileId, {
            fileId: thumbnailFileId,
            url: course.thumbnail,
            name: 'course-thumbnail.jpg',
            type: 'image/jpeg',
            size: 0
          });
          allFileRefs.push(fileRefsMap.get(thumbnailFileId)!);
        }
      }
    }

    // Check limits (risk mitigation)
    if (allFileRefs.length > MAX_FILES) {
      return NextResponse.json({
        error: `Course has too many files (${allFileRefs.length}). Maximum is ${MAX_FILES} files.`
      }, { status: 400 });
    }

    // Download files and create ZIP
    const zip = new JSZip();
    let totalSize = 0;
    const filesFolder = zip.folder('files');
    const fileMap: Record<string, { name: string; hash: string }> = {};

    // Download files (limit to prevent timeout)
    for (let i = 0; i < Math.min(allFileRefs.length, MAX_FILES); i++) {
      const fileRef = allFileRefs[i];
      
      try {
        const fileData = await downloadFile(serviceSupabase, fileRef.fileId, fileRef.url);
        
        if (fileData) {
          // Check total size
          totalSize += fileData.buffer.length;
          if (totalSize > MAX_TOTAL_SIZE) {
            return NextResponse.json({
              error: `Total file size exceeds limit (${Math.round(totalSize / 1024 / 1024)}MB). Maximum is ${MAX_TOTAL_SIZE / 1024 / 1024}MB.`
            }, { status: 400 });
          }

          // Store file in ZIP
          const fileExtension = fileRef.name.split('.').pop() || 'bin';
          const safeFileName = `${fileRef.fileId}.${fileExtension}`;
          filesFolder?.file(safeFileName, fileData.buffer);

          // Store file mapping
          fileMap[fileRef.fileId] = {
            name: safeFileName,
            hash: fileData.hash
          };
        } else {
          console.warn(`Skipping file ${fileRef.fileId} - could not download`);
        }
      } catch (error) {
        console.error(`Error processing file ${fileRef.fileId}:`, error);
        // Continue with other files
      }
    }

    // Fetch user data if requested (admin only)
    let userData: any = null;
    if (includeUserData) {
      // Get all classes for this course
      const { data: classes } = await serviceSupabase
        .from('classes')
        .select('*')
        .eq('course_id', courseId);

      const classIds = (classes || []).map((c: any) => c.id);

      // Get enrollments
      const { data: enrollments } = await serviceSupabase
        .from('enrollments')
        .select('*')
        .in('class_id', classIds);

      // Get progress for all lessons in course
      const lessonIds = (lessons || []).map((l: any) => l.id);
      const { data: progress } = lessonIds.length > 0
        ? await serviceSupabase
            .from('progress')
            .select('*')
            .in('lesson_id', lessonIds)
        : { data: null };

      // Get quiz attempts (via quizzes linked to course)
      const { data: quizzes } = await serviceSupabase
        .from('quizzes')
        .select('id')
        .in('class_id', classIds);

      const quizIds = (quizzes || []).map((q: any) => q.id);
      const { data: quizAttempts } = quizIds.length > 0
        ? await serviceSupabase
            .from('quiz_attempts')
            .select('*')
            .in('quiz_id', quizIds)
        : { data: null };

      // Get assignments
      const { data: assignments } = await serviceSupabase
        .from('assignments')
        .select('*')
        .in('class_id', classIds);

      const assignmentIds = (assignments || []).map((a: any) => a.id);
      
      // Get assignment submissions
      const { data: assignmentSubmissions } = assignmentIds.length > 0
        ? await serviceSupabase
            .from('assignment_submissions')
            .select('*')
            .in('assignment_id', assignmentIds)
        : { data: null };

      // Get grades (via grade_items linked to classes)
      const { data: gradeItems } = await serviceSupabase
        .from('grade_items')
        .select('id')
        .in('class_id', classIds);

      const gradeItemIds = (gradeItems || []).map((gi: any) => gi.id);
      const { data: grades } = gradeItemIds.length > 0
        ? await serviceSupabase
            .from('grades')
            .select('*')
            .in('grade_item_id', gradeItemIds)
        : { data: null };

      // Get user IDs to fetch basic user info (email, name only - no passwords)
      const userIds = new Set<string>();
      (enrollments || []).forEach((e: any) => userIds.add(e.student_id));
      (progress || []).forEach((p: any) => userIds.add(p.student_id));
      (quizAttempts || []).forEach((qa: any) => userIds.add(qa.student_id));
      (assignmentSubmissions || []).forEach((as: any) => userIds.add(as.student_id));
      (grades || []).forEach((g: any) => userIds.add(g.student_id));

      const { data: users } = Array.from(userIds).length > 0
        ? await serviceSupabase
            .from('users')
            .select('id, email, name, role')
            .in('id', Array.from(userIds))
        : { data: null };

      userData = {
        classes: (classes || []).map((c: any) => ({
          ...c,
          id: undefined,
          course_id: undefined,
          created_at: undefined,
          updated_at: undefined
        })),
        enrollments: (enrollments || []).map((e: any) => ({
          ...e,
          id: undefined,
          class_id: undefined, // Will be mapped on restore
          student_id: undefined, // Will be mapped on restore
          created_at: undefined,
          updated_at: undefined,
          student_email: (users || []).find((u: any) => u.id === e.student_id)?.email || null,
          student_name: (users || []).find((u: any) => u.id === e.student_id)?.name || null
        })),
        progress: (progress || []).map((p: any) => ({
          ...p,
          id: undefined,
          lesson_id: undefined, // Will be mapped on restore
          student_id: undefined, // Will be mapped on restore
          created_at: undefined,
          updated_at: undefined,
          student_email: (users || []).find((u: any) => u.id === p.student_id)?.email || null,
          student_name: (users || []).find((u: any) => u.id === p.student_id)?.name || null
        })),
        quizAttempts: (quizAttempts || []).map((qa: any) => ({
          ...qa,
          id: undefined,
          quiz_id: undefined, // Will be mapped on restore
          student_id: undefined, // Will be mapped on restore
          created_at: undefined,
          updated_at: undefined,
          student_email: (users || []).find((u: any) => u.id === qa.student_id)?.email || null,
          student_name: (users || []).find((u: any) => u.id === qa.student_id)?.name || null
        })),
        assignments: (assignments || []).map((a: any) => ({
          ...a,
          id: undefined,
          class_id: undefined, // Will be mapped on restore
          lesson_id: undefined, // Will be mapped on restore
          created_at: undefined,
          updated_at: undefined
        })),
        assignmentSubmissions: (assignmentSubmissions || []).map((as: any) => ({
          ...as,
          id: undefined,
          assignment_id: undefined, // Will be mapped on restore
          student_id: undefined, // Will be mapped on restore
          created_at: undefined,
          updated_at: undefined,
          student_email: (users || []).find((u: any) => u.id === as.student_id)?.email || null,
          student_name: (users || []).find((u: any) => u.id === as.student_id)?.name || null
        })),
        grades: (grades || []).map((g: any) => ({
          ...g,
          id: undefined,
          class_id: undefined, // Will be mapped on restore
          grade_item_id: undefined, // Will be mapped on restore
          student_id: undefined, // Will be mapped on restore
          created_at: undefined,
          updated_at: undefined,
          student_email: (users || []).find((u: any) => u.id === g.student_id)?.email || null,
          student_name: (users || []).find((u: any) => u.id === g.student_id)?.name || null
        })),
        users: (users || []).map((u: any) => ({
          id: undefined,
          email: u.email,
          name: u.name,
          role: u.role
          // Note: No password or sensitive data
        }))
      };
    }

    // Create course backup structure
    const backupData = {
      version: '1.1', // Incremented version for user data support
      timestamp: new Date().toISOString(),
      includesUserData: includeUserData,
      course: {
        ...course,
        id: undefined, // Remove ID - will be generated on restore
        created_at: undefined,
        updated_at: undefined
      },
      instructors: (instructors || []).map((ci: any) => ({
        instructor_id: ci.instructor_id
      })),
      lessons: (lessons || []).map((lesson: any) => ({
        ...lesson,
        id: undefined, // Remove ID - will be generated on restore
        course_id: undefined, // Will be set to new course ID
        created_at: undefined,
        updated_at: undefined
      })),
      files: fileMap,
      ...(includeUserData && userData ? { userData } : {})
    };

    // Add manifest to ZIP
    zip.file('manifest.json', JSON.stringify(backupData, null, 2));

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Return ZIP file
    const fileName = `course-backup-${course.title.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipBuffer.length.toString()
      }
    });

  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({
      error: `Backup failed: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

