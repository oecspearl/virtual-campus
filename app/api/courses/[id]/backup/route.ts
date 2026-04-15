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
const FILE_DOWNLOAD_CONCURRENCY = 5;

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
    const storageUrlMatch = url?.match(/\/storage\/v1\/object\/public\/course-materials\/(.+)/);
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

/**
 * Download files in batches for concurrency control
 */
async function downloadFilesBatched(
  supabase: any,
  fileRefs: FileReference[],
  concurrency: number
): Promise<Map<string, { buffer: Buffer; hash: string }>> {
  const results = new Map<string, { buffer: Buffer; hash: string }>();

  for (let i = 0; i < fileRefs.length; i += concurrency) {
    const batch = fileRefs.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (ref) => {
        const result = await downloadFile(supabase, ref.fileId, ref.url);
        return { fileId: ref.fileId, result };
      })
    );
    for (const { fileId, result } of batchResults) {
      if (result) {
        results.set(fileId, result);
      }
    }
  }

  return results;
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

    // Resolve tenant to scope all queries
    let tenantId = '00000000-0000-0000-0000-000000000001';
    try {
      const { getTenantIdFromRequest } = await import('@/lib/tenant-query');
      tenantId = getTenantIdFromRequest(request as any);
    } catch {
      // fallback to default tenant
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Fetch course data — tenant-scoped via serviceSupabase + explicit tenant filter
    const { data: course, error: courseError } = await serviceSupabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
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

    // Fetch course instructors — also fetch email for cross-tenant restore
    const { data: instructors } = await serviceSupabase
      .from('course_instructors')
      .select('instructor_id, users:instructor_id(email)')
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId);

    // Fetch all lessons for this course — tenant-scoped
    const { data: lessons, error: lessonsError } = await serviceSupabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
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

    // Download files concurrently in batches
    const zip = new JSZip();
    let totalSize = 0;
    const filesFolder = zip.folder('files');
    const fileMap: Record<string, { name: string; hash: string }> = {};

    const downloadedFiles = await downloadFilesBatched(
      serviceSupabase,
      allFileRefs.slice(0, MAX_FILES),
      FILE_DOWNLOAD_CONCURRENCY
    );

    for (const fileRef of allFileRefs.slice(0, MAX_FILES)) {
      const fileData = downloadedFiles.get(fileRef.fileId);
      if (!fileData) {
        console.warn(`Skipping file ${fileRef.fileId} - could not download`);
        continue;
      }

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
    }

    // Fetch user data if requested (admin only)
    let userData: any = null;
    if (includeUserData) {
      // Get all classes for this course — tenant-scoped
      const { data: classes } = await serviceSupabase
        .from('classes')
        .select('*')
        .eq('course_id', courseId)
        .eq('tenant_id', tenantId);

      const classIds = (classes || []).map((c: any) => c.id);

      // Get enrollments — tenant-scoped
      const { data: enrollments } = classIds.length > 0
        ? await serviceSupabase
            .from('enrollments')
            .select('*')
            .in('class_id', classIds)
            .eq('tenant_id', tenantId)
        : { data: null };

      // Get progress for all lessons in course — tenant-scoped
      const lessonIds = (lessons || []).map((l: any) => l.id);
      const { data: progress } = lessonIds.length > 0
        ? await serviceSupabase
            .from('progress')
            .select('*')
            .in('lesson_id', lessonIds)
            .eq('tenant_id', tenantId)
        : { data: null };

      // Get quiz attempts (via quizzes linked to course) — tenant-scoped
      const { data: quizzes } = classIds.length > 0
        ? await serviceSupabase
            .from('quizzes')
            .select('id')
            .in('class_id', classIds)
            .eq('tenant_id', tenantId)
        : { data: null };

      const quizIds = (quizzes || []).map((q: any) => q.id);
      const { data: quizAttempts } = quizIds.length > 0
        ? await serviceSupabase
            .from('quiz_attempts')
            .select('*')
            .in('quiz_id', quizIds)
            .eq('tenant_id', tenantId)
        : { data: null };

      // Get assignments — tenant-scoped
      const { data: assignments } = classIds.length > 0
        ? await serviceSupabase
            .from('assignments')
            .select('*')
            .in('class_id', classIds)
            .eq('tenant_id', tenantId)
        : { data: null };

      const assignmentIds = (assignments || []).map((a: any) => a.id);

      // Get assignment submissions — tenant-scoped
      const { data: assignmentSubmissions } = assignmentIds.length > 0
        ? await serviceSupabase
            .from('assignment_submissions')
            .select('*')
            .in('assignment_id', assignmentIds)
            .eq('tenant_id', tenantId)
        : { data: null };

      // Get grades (via grade_items linked to classes) — tenant-scoped
      const { data: gradeItems } = classIds.length > 0
        ? await serviceSupabase
            .from('grade_items')
            .select('id')
            .in('class_id', classIds)
            .eq('tenant_id', tenantId)
        : { data: null };

      const gradeItemIds = (gradeItems || []).map((gi: any) => gi.id);
      const { data: grades } = gradeItemIds.length > 0
        ? await serviceSupabase
            .from('grades')
            .select('*')
            .in('grade_item_id', gradeItemIds)
            .eq('tenant_id', tenantId)
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
            .eq('tenant_id', tenantId)
        : { data: null };

      // Build user lookup map for O(1) access instead of O(n) find() per record
      const userMap = new Map<string, { email: string; name: string; role: string }>();
      (users || []).forEach((u: any) => userMap.set(u.id, { email: u.email, name: u.name, role: u.role }));

      // Preserve original class IDs for stable mapping during restore
      userData = {
        classes: (classes || []).map((c: any) => {
          const { tenant_id: _t, created_at: _ca, updated_at: _ua, ...rest } = c;
          return { ...rest, _original_id: c.id };
        }),
        enrollments: (enrollments || []).map((e: any) => {
          const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = e;
          const userInfo = userMap.get(e.student_id);
          return {
            ...rest,
            _original_class_id: e.class_id,
            student_email: userInfo?.email || null,
            student_name: userInfo?.name || null
          };
        }),
        progress: (progress || []).map((p: any) => {
          const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = p;
          const userInfo = userMap.get(p.student_id);
          return {
            ...rest,
            _original_lesson_id: p.lesson_id,
            student_email: userInfo?.email || null,
            student_name: userInfo?.name || null
          };
        }),
        quizAttempts: (quizAttempts || []).map((qa: any) => {
          const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = qa;
          const userInfo = userMap.get(qa.student_id);
          return {
            ...rest,
            _original_quiz_id: qa.quiz_id,
            student_email: userInfo?.email || null,
            student_name: userInfo?.name || null
          };
        }),
        assignments: (assignments || []).map((a: any) => {
          const { created_at: _ca, updated_at: _ua, ...rest } = a;
          return { ...rest, _original_id: a.id, _original_class_id: a.class_id, _original_lesson_id: a.lesson_id };
        }),
        assignmentSubmissions: (assignmentSubmissions || []).map((as: any) => {
          const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = as;
          const userInfo = userMap.get(as.student_id);
          return {
            ...rest,
            _original_assignment_id: as.assignment_id,
            student_email: userInfo?.email || null,
            student_name: userInfo?.name || null
          };
        }),
        grades: (grades || []).map((g: any) => {
          const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = g;
          const userInfo = userMap.get(g.student_id);
          return {
            ...rest,
            _original_class_id: g.class_id,
            _original_grade_item_id: g.grade_item_id,
            student_email: userInfo?.email || null,
            student_name: userInfo?.name || null
          };
        }),
        users: (users || []).map((u: any) => ({
          email: u.email,
          name: u.name,
          role: u.role
          // Note: No password or sensitive data
        }))
      };
    }

    // Build lesson ID mapping for prerequisite preservation
    const lessonList = lessons || [];

    // ── Fetch assessments linked to this course ──

    // Quizzes (linked by course_id or by lesson_id)
    const lessonIds = lessonList.map((l: any) => l.id);
    let quizzesQuery = serviceSupabase
      .from('quizzes')
      .select('*')
      .eq('tenant_id', tenantId);

    if (lessonIds.length > 0) {
      quizzesQuery = quizzesQuery.or(`course_id.eq.${courseId},lesson_id.in.(${lessonIds.join(',')})`);
    } else {
      quizzesQuery = quizzesQuery.eq('course_id', courseId);
    }

    const { data: quizzes } = await quizzesQuery;
    const quizIds = (quizzes || []).map((q: any) => q.id);

    // Questions for each quiz
    const { data: questions } = quizIds.length > 0
      ? await serviceSupabase
          .from('questions')
          .select('*')
          .in('quiz_id', quizIds)
          .eq('tenant_id', tenantId)
          .order('order', { ascending: true })
      : { data: null };

    // Assignments (linked by course_id or lesson_id)
    let assignmentsQuery = serviceSupabase
      .from('assignments')
      .select('*')
      .eq('tenant_id', tenantId);

    if (lessonIds.length > 0) {
      assignmentsQuery = assignmentsQuery.or(`course_id.eq.${courseId},lesson_id.in.(${lessonIds.join(',')})`);
    } else {
      assignmentsQuery = assignmentsQuery.eq('course_id', courseId);
    }

    const { data: courseAssignments } = await assignmentsQuery;

    // Discussions linked to course
    const { data: courseDiscussions } = await serviceSupabase
      .from('discussions')
      .select('*')
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId);

    // Create course backup structure — use destructuring to strip volatile fields
    const { id: _cid, tenant_id: _ctid, created_at: _cca, updated_at: _cua, ...courseBackupFields } = course;
    const backupData = {
      version: '1.3', // Includes assessments
      timestamp: new Date().toISOString(),
      includesUserData: includeUserData,
      course: courseBackupFields,
      instructors: (instructors || []).map((ci: any) => ({
        instructor_id: ci.instructor_id,
        instructor_email: ci.users?.email || null
      })),
      lessons: lessonList.map((lesson: any) => {
        const { id: _lid, course_id: _lcid, tenant_id: _ltid, created_at: _lca, updated_at: _lua, ...lessonFields } = lesson;
        return {
          ...lessonFields,
          _original_id: lesson.id,
          _original_prerequisite_lesson_id: lesson.prerequisite_lesson_id,
          prerequisite_lesson_id: null
        };
      }),
      quizzes: (quizzes || []).map((quiz: any) => {
        const { id: _qid, tenant_id: _qtid, creator_id: _qcr, created_at: _qca, updated_at: _qua, ...quizFields } = quiz;
        return {
          ...quizFields,
          _original_id: quiz.id,
          _original_lesson_id: quiz.lesson_id,
          _original_course_id: quiz.course_id,
          lesson_id: null,
          course_id: null,
        };
      }),
      questions: (questions || []).map((q: any) => {
        const { id: _qid, tenant_id: _qtid, created_at: _qca, updated_at: _qua, ...qFields } = q;
        return {
          ...qFields,
          _original_id: q.id,
          _original_quiz_id: q.quiz_id,
          quiz_id: null,
        };
      }),
      assignments: (courseAssignments || []).map((a: any) => {
        const { id: _aid, tenant_id: _atid, creator_id: _acr, created_at: _aca, updated_at: _aua, ...aFields } = a;
        return {
          ...aFields,
          _original_id: a.id,
          _original_lesson_id: a.lesson_id,
          _original_course_id: a.course_id,
          lesson_id: null,
          course_id: null,
        };
      }),
      discussions: (courseDiscussions || []).map((d: any) => {
        const { id: _did, tenant_id: _dtid, creator_id: _dcr, created_at: _dca, updated_at: _dua, ...dFields } = d;
        return {
          ...dFields,
          _original_id: d.id,
          course_id: null,
        };
      }),
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
      error: 'Backup failed. Please try again or contact support.'
    }, { status: 500 });
  }
}
