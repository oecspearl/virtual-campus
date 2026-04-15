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
const MAX_UNCOMPRESSED_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const FILE_UPLOAD_CONCURRENCY = 5;

interface BackupManifest {
  version: string;
  timestamp: string;
  includesUserData?: boolean;
  course: any;
  instructors: Array<{ instructor_id: string; instructor_email?: string }>;
  lessons: any[];
  quizzes?: any[];
  questions?: any[];
  assignments?: any[];
  discussions?: any[];
  files: Record<string, { name: string; hash: string }>;
  userData?: {
    classes: any[];
    enrollments: any[];
    progress: any[];
    quizAttempts: any[];
    assignments: any[];
    assignmentSubmissions: any[];
    grades: any[];
    users: Array<{ email: string; name: string; role: string }>;
  };
}

/**
 * Sanitize file path to prevent path traversal attacks
 */
function sanitizePath(path: string): string {
  // Remove any path traversal attempts
  return path.replace(/\.\./g, '').replace(/\/+/g, '/').replace(/^\//, '');
}

/**
 * Strip internal mapping fields (prefixed with _) before DB insert
 */
function stripInternalFields(obj: any): any {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('_') && key !== 'student_email' && key !== 'student_name') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Update file references in content/resource items, handling both fileId and file_id patterns
 */
function updateFileReferences(items: any[], fileMapping: Record<string, string>): any[] {
  return (items || []).map((item: any) => {
    if (!item?.data) return item;

    const oldFileId = item.data.fileId || item.data.file_id;
    if (oldFileId && fileMapping[oldFileId]) {
      const newFileId = fileMapping[oldFileId];
      return {
        ...item,
        data: {
          ...item.data,
          ...(item.data.fileId ? { fileId: newFileId } : {}),
          ...(item.data.file_id ? { file_id: newFileId } : {}),
          url: `/api/files/${newFileId}`
        }
      };
    }
    return item;
  });
}

export async function POST(request: Request) {
  // Track created resources for rollback on failure
  let createdCourseId: string | null = null;
  let uploadedStorageFiles: string[] = [];
  let createdFileIds: string[] = [];
  let serviceSupabase: any = null;

  try {
    // Authenticate user
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile, user } = authResult;

    // Check permissions - only instructors, admins can restore
    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    serviceSupabase = createServiceSupabaseClient();

    // Resolve tenant for this request
    let tenantId = '00000000-0000-0000-0000-000000000001';
    try {
      const { getTenantIdFromRequest } = await import('@/lib/tenant-query');
      tenantId = getTenantIdFromRequest(request as any);
    } catch {
      // fallback to default tenant
    }

    let buffer: Buffer;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Storage-first flow: file already uploaded to Supabase Storage
      const body = await request.json();
      const { storagePath } = body;

      if (!storagePath) {
        return NextResponse.json({ error: "No storagePath provided" }, { status: 400 });
      }

      const { data: fileData, error: downloadError } = await serviceSupabase.storage
        .from('course-materials')
        .download(storagePath);

      if (downloadError || !fileData) {
        return NextResponse.json({ error: "Failed to download backup from storage" }, { status: 400 });
      }

      buffer = Buffer.from(await fileData.arrayBuffer());

      // Clean up temp file (fire and forget)
      serviceSupabase.storage.from('course-materials').remove([storagePath]).catch(() => {});
    } else {
      // Legacy flow: file sent directly in FormData
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: "No backup file provided" }, { status: 400 });
      }

      if (!file.name.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
        return NextResponse.json({ error: "Backup file must be a ZIP file" }, { status: 400 });
      }

      if (file.size > MAX_TOTAL_SIZE) {
        return NextResponse.json({
          error: `Backup file too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is ${MAX_TOTAL_SIZE / 1024 / 1024}MB.`
        }, { status: 400 });
      }

      buffer = Buffer.from(await file.arrayBuffer());
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch (error) {
      return NextResponse.json({ error: "Invalid ZIP file format" }, { status: 400 });
    }

    // Validate ZIP structure - check for manifest.json
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      return NextResponse.json({ error: "Invalid backup file: manifest.json not found" }, { status: 400 });
    }

    // ZIP bomb protection: extract manifest first, then measure actual file sizes
    // instead of relying on unreliable internal JSZip properties
    let totalExtractedSize = 0;
    const filesInZip = new Map<string, JSZip.JSZipObject>();
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        filesInZip.set(relativePath, zipEntry);
      }
    });

    // Parse manifest first (small file, safe to extract)
    const manifestContent = await manifestFile.async('string');
    totalExtractedSize += manifestContent.length;

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(manifestContent);
    } catch (error) {
      return NextResponse.json({ error: "Invalid manifest.json format" }, { status: 400 });
    }

    // Validate manifest structure
    if (!manifest.course || !manifest.version) {
      return NextResponse.json({ error: "Invalid backup format: missing required fields" }, { status: 400 });
    }

    // Check file count
    const fileCount = Object.keys(manifest.files || {}).length;
    if (fileCount > MAX_FILES) {
      return NextResponse.json({
        error: `Backup contains too many files (${fileCount}). Maximum is ${MAX_FILES} files.`
      }, { status: 400 });
    }

    // Check for duplicate course name within the tenant
    const { data: existingCourse } = await serviceSupabase
      .from('courses')
      .select('id')
      .eq('title', manifest.course.title)
      .eq('tenant_id', tenantId)
      .single();

    const courseTitle = existingCourse
      ? `${manifest.course.title} (Restored ${new Date().toISOString().split('T')[0]})`
      : manifest.course.title;

    // Create new course - strip old id/tenant_id and set current tenant
    const { id: _oldCourseId, tenant_id: _oldCourseTenant, created_at: _cc, updated_at: _cu, ...courseFields } = manifest.course;
    const newCourseData = {
      ...stripInternalFields(courseFields),
      title: courseTitle,
      tenant_id: tenantId,
      published: false, // Restore as unpublished by default
      featured: false
    };

    const { data: newCourse, error: courseError } = await serviceSupabase
      .from('courses')
      .insert([newCourseData])
      .select()
      .single();

    if (courseError || !newCourse) {
      console.error('Course creation error:', courseError);
      return NextResponse.json({ error: `Failed to create course: ${courseError?.message}` }, { status: 500 });
    }

    createdCourseId = newCourse.id;

    // Upload files with concurrency control and size tracking
    const fileMapping: Record<string, string> = {};
    const filesFolder = zip.folder('files');

    if (filesFolder && manifest.files) {
      const fileEntries = Object.entries(manifest.files);

      for (let i = 0; i < fileEntries.length; i += FILE_UPLOAD_CONCURRENCY) {
        const batch = fileEntries.slice(i, i + FILE_UPLOAD_CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map(async ([oldFileId, fileInfo]) => {
            try {
              const zipFile = filesFolder.file(fileInfo.name);
              if (!zipFile) {
                console.warn(`File ${fileInfo.name} not found in ZIP`);
                return null;
              }

              // Read file from ZIP and track extracted size for ZIP bomb protection
              const fileBuffer = await zipFile.async('nodebuffer');
              totalExtractedSize += fileBuffer.length;
              if (totalExtractedSize > MAX_UNCOMPRESSED_SIZE) {
                throw new Error('ZIP bomb detected: uncompressed size exceeds limit');
              }

              const hash = createHash('sha256').update(fileBuffer).digest('hex');

              // Check if file hash matches (security check)
              if (fileInfo.hash && hash !== fileInfo.hash) {
                console.warn(`File hash mismatch for ${fileInfo.name}`);
              }

              // Generate unique filename
              const timestamp = Date.now();
              const randomString = Math.random().toString(36).substring(2, 15);
              const fileExtension = fileInfo.name.split('.').pop() || 'bin';
              const fileName = sanitizePath(`${timestamp}-${randomString}.${fileExtension}`);

              // Upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await serviceSupabase.storage
                .from('course-materials')
                .upload(fileName, fileBuffer, {
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) {
                console.error(`Failed to upload file ${fileInfo.name}:`, uploadError);
                return null;
              }

              uploadedStorageFiles.push(fileName);

              // Get public URL
              const { data: urlData } = serviceSupabase.storage
                .from('course-materials')
                .getPublicUrl(fileName);

              // Create file record in database
              const { data: fileRecord, error: fileRecordError } = await serviceSupabase
                .from('files')
                .insert([{
                  name: fileInfo.name,
                  type: 'application/octet-stream',
                  size: fileBuffer.length,
                  url: urlData.publicUrl,
                  uploaded_by: user.id,
                  course_id: newCourse.id,
                  tenant_id: tenantId
                }])
                .select()
                .single();

              if (fileRecordError || !fileRecord) {
                console.error(`Failed to create file record for ${fileInfo.name}:`, fileRecordError);
                await serviceSupabase.storage.from('course-materials').remove([fileName]);
                uploadedStorageFiles = uploadedStorageFiles.filter(f => f !== fileName);
                return null;
              }

              createdFileIds.push(fileRecord.id);
              return { oldFileId, newFileId: fileRecord.id };
            } catch (error: any) {
              if (error.message?.includes('ZIP bomb')) throw error;
              console.error(`Error processing file ${fileInfo.name}:`, error);
              return null;
            }
          })
        );

        for (const result of batchResults) {
          if (result) {
            fileMapping[result.oldFileId] = result.newFileId;
          }
        }
      }
    }

    // Create lessons with file reference updates and prerequisite tracking
    const newLessons: any[] = [];
    // Map original lesson ID -> new lesson ID for prerequisite remapping
    const lessonIdMapping: Record<string, string> = {};

    for (const lesson of manifest.lessons || []) {
      try {
        // Update file references in content and resources (handles both fileId and file_id)
        const updatedContent = updateFileReferences(lesson.content, fileMapping);
        const updatedResources = updateFileReferences(lesson.resources, fileMapping);

        // Strip internal fields and old identifiers
        const { id: _oldLessonId, tenant_id: _oldLessonTenant, created_at: _lc, updated_at: _lu,
                _original_id, _original_prerequisite_lesson_id, ...lessonFields } = lesson;

        const lessonData = {
          ...stripInternalFields(lessonFields),
          course_id: newCourse.id,
          tenant_id: tenantId,
          content: updatedContent,
          resources: updatedResources,
          prerequisite_lesson_id: null, // Will be remapped after all lessons created
          published: false
        };

        const { data: newLesson, error: lessonError } = await serviceSupabase
          .from('lessons')
          .insert([lessonData])
          .select()
          .single();

        if (lessonError || !newLesson) {
          console.error('Lesson creation error:', lessonError);
          continue;
        }

        newLessons.push(newLesson);

        // Track mapping using _original_id (v1.2+) or index-based fallback
        const origId = _original_id || lesson._original_id;
        if (origId) {
          lessonIdMapping[origId] = newLesson.id;
        }
      } catch (error) {
        console.error(`Error creating lesson ${lesson.title}:`, error);
      }
    }

    // Remap prerequisite_lesson_id references
    for (const lesson of manifest.lessons || []) {
      const origId = lesson._original_id;
      const origPrereqId = lesson._original_prerequisite_lesson_id;

      if (origId && origPrereqId && lessonIdMapping[origId] && lessonIdMapping[origPrereqId]) {
        await serviceSupabase
          .from('lessons')
          .update({ prerequisite_lesson_id: lessonIdMapping[origPrereqId] })
          .eq('id', lessonIdMapping[origId]);
      }
    }

    // ── Restore assessments (quizzes, questions, assignments, discussions) ──
    const quizIdMapping: Record<string, string> = {};
    let quizzesRestored = 0;
    let questionsRestored = 0;
    let assignmentsRestored = 0;
    let discussionsRestored = 0;

    // Restore quizzes
    for (const quiz of manifest.quizzes || []) {
      try {
        const { _original_id, _original_lesson_id, _original_course_id, ...quizFields } = quiz;

        const quizData = {
          ...stripInternalFields(quizFields),
          course_id: newCourse.id,
          lesson_id: _original_lesson_id ? (lessonIdMapping[_original_lesson_id] || null) : null,
          tenant_id: tenantId,
          creator_id: user.id,
          published: false,
        };

        const { data: newQuiz, error: quizError } = await serviceSupabase
          .from('quizzes')
          .insert([quizData])
          .select()
          .single();

        if (quizError || !newQuiz) {
          console.error(`Quiz creation error for "${quiz.title}":`, quizError);
          continue;
        }

        if (_original_id) {
          quizIdMapping[_original_id] = newQuiz.id;
        }
        quizzesRestored++;
      } catch (error) {
        console.error(`Error restoring quiz "${quiz.title}":`, error);
      }
    }

    // Restore questions (linked to quizzes)
    for (const question of manifest.questions || []) {
      try {
        const { _original_id, _original_quiz_id, ...qFields } = question;

        const newQuizId = _original_quiz_id ? quizIdMapping[_original_quiz_id] : null;
        if (!newQuizId) continue; // Skip orphaned questions

        const questionData = {
          ...stripInternalFields(qFields),
          quiz_id: newQuizId,
          tenant_id: tenantId,
        };

        const { error: qError } = await serviceSupabase
          .from('questions')
          .insert([questionData]);

        if (qError) {
          console.error(`Question creation error:`, qError);
          continue;
        }
        questionsRestored++;
      } catch (error) {
        console.error('Error restoring question:', error);
      }
    }

    // Restore assignments
    for (const assignment of manifest.assignments || []) {
      try {
        const { _original_id, _original_lesson_id, _original_course_id, _original_class_id, ...aFields } = assignment;

        const assignmentData = {
          ...stripInternalFields(aFields),
          course_id: newCourse.id,
          lesson_id: _original_lesson_id ? (lessonIdMapping[_original_lesson_id] || null) : null,
          class_id: null,
          tenant_id: tenantId,
          creator_id: user.id,
          published: false,
        };

        const { error: aError } = await serviceSupabase
          .from('assignments')
          .insert([assignmentData]);

        if (aError) {
          console.error(`Assignment creation error for "${assignment.title}":`, aError);
          continue;
        }
        assignmentsRestored++;
      } catch (error) {
        console.error(`Error restoring assignment "${assignment.title}":`, error);
      }
    }

    // Restore discussions
    for (const discussion of manifest.discussions || []) {
      try {
        const { _original_id, ...dFields } = discussion;

        const discussionData = {
          ...stripInternalFields(dFields),
          course_id: newCourse.id,
          tenant_id: tenantId,
          creator_id: user.id,
        };

        const { error: dError } = await serviceSupabase
          .from('discussions')
          .insert([discussionData]);

        if (dError) {
          console.error(`Discussion creation error:`, dError);
          continue;
        }
        discussionsRestored++;
      } catch (error) {
        console.error('Error restoring discussion:', error);
      }
    }

    // Add course instructors — use email for cross-tenant lookup, fall back to UUID
    if (manifest.instructors && manifest.instructors.length > 0) {
      const instructorInserts = [];

      for (const instructorRef of manifest.instructors) {
        let instructorId: string | null = null;

        // Try email-based lookup first (works cross-tenant)
        if (instructorRef.instructor_email) {
          const { data: byEmail } = await serviceSupabase
            .from('users')
            .select('id')
            .eq('email', instructorRef.instructor_email)
            .eq('tenant_id', tenantId)
            .single();
          if (byEmail) instructorId = byEmail.id;
        }

        // Fall back to UUID lookup within same tenant
        if (!instructorId && instructorRef.instructor_id) {
          const { data: byId } = await serviceSupabase
            .from('users')
            .select('id')
            .eq('id', instructorRef.instructor_id)
            .eq('tenant_id', tenantId)
            .single();
          if (byId) instructorId = byId.id;
        }

        if (instructorId && !instructorInserts.find(ci => ci.instructor_id === instructorId)) {
          instructorInserts.push({
            course_id: newCourse.id,
            instructor_id: instructorId,
            tenant_id: tenantId
          });
        }
      }

      // Always add current user as instructor
      if (!instructorInserts.find(ci => ci.instructor_id === user.id)) {
        instructorInserts.push({
          course_id: newCourse.id,
          instructor_id: user.id,
          tenant_id: tenantId
        });
      }

      if (instructorInserts.length > 0) {
        await serviceSupabase.from('course_instructors').insert(instructorInserts);
      }
    } else {
      await serviceSupabase.from('course_instructors').insert([{
        course_id: newCourse.id,
        instructor_id: user.id,
        tenant_id: tenantId
      }]);
    }

    // Update course thumbnail if it was in the backup
    if (manifest.course.thumbnail) {
      const thumbnailMatch = manifest.course.thumbnail.match(/\/api\/files\/([^/?]+)/);
      if (thumbnailMatch && fileMapping[thumbnailMatch[1]]) {
        await serviceSupabase
          .from('courses')
          .update({ thumbnail: `/api/files/${fileMapping[thumbnailMatch[1]]}` })
          .eq('id', newCourse.id);
      }
    }

    // Restore user data if included (admin only)
    let userDataRestored = false;
    const userDataStats = {
      classesCreated: 0,
      enrollmentsCreated: 0,
      progressCreated: 0,
      quizAttemptsCreated: 0,
      assignmentsCreated: 0,
      submissionsCreated: 0,
      gradesCreated: 0
    };

    if (manifest.includesUserData && manifest.userData && hasRole(userProfile.role, ["admin", "super_admin"])) {
      try {
        const userData = manifest.userData;

        // Create user mapping (email -> user ID)
        const userEmailMap: Record<string, string> = {};
        for (const userRef of userData.users || []) {
          // Find existing user by email within this tenant
          const { data: existingUser } = await serviceSupabase
            .from('users')
            .select('id')
            .eq('email', userRef.email)
            .eq('tenant_id', tenantId)
            .single();

          if (existingUser) {
            userEmailMap[userRef.email] = existingUser.id;
          } else {
            // Create new user (without password - they'll need to reset)
            const { data: newUser } = await serviceSupabase.auth.admin.createUser({
              email: userRef.email,
              email_confirm: true,
              user_metadata: {
                name: userRef.name,
                role: userRef.role
              }
            });

            if (newUser?.user?.id) {
              userEmailMap[userRef.email] = newUser.user.id;

              // Update user role and tenant_id
              await serviceSupabase
                .from('users')
                .update({ role: userRef.role, tenant_id: tenantId })
                .eq('id', newUser.user.id);

              // Create tenant membership
              await serviceSupabase
                .from('tenant_memberships')
                .insert([{
                  tenant_id: tenantId,
                  user_id: newUser.user.id,
                  role: userRef.role
                }]);
            }
          }
        }

        // Create classes with stable ID mapping using _original_id
        const classMapping: Record<string, string> = {};
        for (const classData of userData.classes || []) {
          const originalClassId = classData._original_id;
          const cleanedData = stripInternalFields(classData);
          const { id: _cid, tenant_id: _ctid, course_id: _ccid, ...classFields } = cleanedData;

          const newClassData = {
            ...classFields,
            course_id: newCourse.id,
            tenant_id: tenantId
          };

          const { data: newClass } = await serviceSupabase
            .from('classes')
            .insert([newClassData])
            .select()
            .single();

          if (newClass && originalClassId) {
            classMapping[originalClassId] = newClass.id;
            userDataStats.classesCreated++;
          }
        }

        // Create enrollments — map class by _original_class_id and student by email
        for (const enrollment of userData.enrollments || []) {
          const studentId = enrollment.student_email ? userEmailMap[enrollment.student_email] : null;
          if (!studentId) continue;

          const originalClassId = enrollment._original_class_id;
          const classId = originalClassId ? classMapping[originalClassId] : null;
          if (!classId) continue;

          const cleanedEnrollment = stripInternalFields(enrollment);
          const { id: _eid, class_id: _ecid, student_id: _esid, tenant_id: _etid, ...enrollmentFields } = cleanedEnrollment;

          const { data: newEnrollment } = await serviceSupabase
            .from('enrollments')
            .insert([{
              ...enrollmentFields,
              class_id: classId,
              student_id: studentId,
              tenant_id: tenantId
            }])
            .select()
            .single();

          if (newEnrollment) {
            userDataStats.enrollmentsCreated++;
          }
        }

        // Create progress — map lesson by _original_lesson_id and student by email
        for (const progress of userData.progress || []) {
          const studentId = progress.student_email ? userEmailMap[progress.student_email] : null;
          if (!studentId) continue;

          const originalLessonId = progress._original_lesson_id;
          const lessonId = originalLessonId ? lessonIdMapping[originalLessonId] : null;
          if (!lessonId) continue;

          const cleanedProgress = stripInternalFields(progress);
          const { id: _pid, lesson_id: _plid, student_id: _psid, tenant_id: _ptid, ...progressFields } = cleanedProgress;

          const { data: newProgress } = await serviceSupabase
            .from('progress')
            .insert([{
              ...progressFields,
              lesson_id: lessonId,
              student_id: studentId,
              tenant_id: tenantId
            }])
            .select()
            .single();

          if (newProgress) {
            userDataStats.progressCreated++;
          }
        }

        // Note: Quiz attempts, assignments, submissions, and grades restoration
        // requires quizzes/assignments to exist in the restored course.
        // These are structural elements that should be cloned separately.
        // The mapping IDs are preserved in the backup for future implementation.

        userDataRestored = true;
      } catch (error) {
        console.error('Error restoring user data:', error);
        // Continue even if user data restoration fails — course structure is intact
      }
    }

    return NextResponse.json({
      success: true,
      course: newCourse,
      lessonsCreated: newLessons.length,
      quizzesRestored,
      questionsRestored,
      assignmentsRestored,
      discussionsRestored,
      filesRestored: Object.keys(fileMapping).length,
      userDataRestored,
      userDataStats: userDataRestored ? userDataStats : null,
      message: `Course restored successfully. ${newLessons.length} lessons, ${quizzesRestored} quizzes (${questionsRestored} questions), ${assignmentsRestored} assignments, ${discussionsRestored} discussions, and ${Object.keys(fileMapping).length} files restored.${userDataRestored ? ` User data: ${userDataStats.enrollmentsCreated} enrollments, ${userDataStats.progressCreated} progress records.` : ''}`
    });

  } catch (error: any) {
    console.error('Restore error:', error);

    // Rollback: clean up partially created resources
    if (serviceSupabase) {
      try {
        // Remove uploaded storage files
        if (uploadedStorageFiles.length > 0) {
          await serviceSupabase.storage.from('course-materials').remove(uploadedStorageFiles);
        }

        // Remove created file records
        if (createdFileIds.length > 0) {
          await serviceSupabase.from('files').delete().in('id', createdFileIds);
        }

        // Remove the course (cascades to lessons, instructors, etc.)
        if (createdCourseId) {
          await serviceSupabase.from('courses').delete().eq('id', createdCourseId);
        }
      } catch (cleanupError) {
        console.error('Rollback cleanup error:', cleanupError);
      }
    }

    return NextResponse.json({
      error: `Restore failed: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
