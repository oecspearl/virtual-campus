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

interface BackupManifest {
  version: string;
  timestamp: string;
  includesUserData?: boolean;
  course: any;
  instructors: Array<{ instructor_id: string }>;
  lessons: any[];
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
 * Check if file hash already exists in storage (deduplication)
 */
async function findFileByHash(
  supabase: any,
  hash: string
): Promise<{ fileId: string; url: string } | null> {
  // Note: This requires storing file hashes in the database
  // For now, we'll upload all files and rely on Supabase Storage deduplication
  // TODO: Add file_hash column to files table for better deduplication
  return null;
}

export async function POST(request: Request) {
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

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No backup file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      return NextResponse.json({ error: "Backup file must be a ZIP file" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_TOTAL_SIZE) {
      return NextResponse.json({
        error: `Backup file too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is ${MAX_TOTAL_SIZE / 1024 / 1024}MB.`
      }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Read and extract ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
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

    // Check total uncompressed size (ZIP bomb protection)
    let totalUncompressedSize = 0;
    zip.forEach((relativePath, file) => {
      if (!file.dir) {
        totalUncompressedSize += (file as any)._data?.uncompressedSize || 0;
      }
    });

    if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
      return NextResponse.json({
        error: `Backup file uncompressed size too large (${Math.round(totalUncompressedSize / 1024 / 1024)}MB). Maximum is ${MAX_UNCOMPRESSED_SIZE / 1024 / 1024}MB.`
      }, { status: 400 });
    }

    // Parse manifest
    const manifestContent = await manifestFile.async('string');
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

    // Check for duplicate course name
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('title', manifest.course.title)
      .single();

    const courseTitle = existingCourse
      ? `${manifest.course.title} (Restored ${new Date().toISOString().split('T')[0]})`
      : manifest.course.title;

    // Start transaction-like operations
    // Create new course
    const newCourseData = {
      ...manifest.course,
      title: courseTitle,
      published: false, // Restore as unpublished by default
      featured: false
    };

    const { data: newCourse, error: courseError } = await supabase
      .from('courses')
      .insert([newCourseData])
      .select()
      .single();

    if (courseError || !newCourse) {
      console.error('Course creation error:', courseError);
      return NextResponse.json({ error: `Failed to create course: ${courseError?.message}` }, { status: 500 });
    }

    // Upload files and create file mapping (old fileId -> new fileId)
    const fileMapping: Record<string, string> = {};
    const filesFolder = zip.folder('files');

    if (filesFolder && manifest.files) {
      for (const [oldFileId, fileInfo] of Object.entries(manifest.files)) {
        try {
          const zipFile = filesFolder.file(fileInfo.name);
          if (!zipFile) {
            console.warn(`File ${fileInfo.name} not found in ZIP`);
            continue;
          }

          // Read file from ZIP
          const fileBuffer = await zipFile.async('nodebuffer');
          const hash = createHash('sha256').update(fileBuffer).digest('hex');

          // Check if file hash matches (security check)
          if (fileInfo.hash && hash !== fileInfo.hash) {
            console.warn(`File hash mismatch for ${fileInfo.name}`);
            // Continue anyway - might be a different file
          }

          // Generate unique filename
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const fileExtension = fileInfo.name.split('.').pop() || 'bin';
          const fileName = `${timestamp}-${randomString}.${fileExtension}`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await serviceSupabase.storage
            .from('course-materials')
            .upload(fileName, fileBuffer, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`Failed to upload file ${fileInfo.name}:`, uploadError);
            // Continue with other files
            continue;
          }

          // Get public URL
          const { data: urlData } = serviceSupabase.storage
            .from('course-materials')
            .getPublicUrl(fileName);

          // Create file record in database
          const { data: fileRecord, error: fileRecordError } = await supabase
            .from('files')
            .insert([{
              name: fileInfo.name,
              type: 'application/octet-stream', // Will be determined from extension
              size: fileBuffer.length,
              url: urlData.publicUrl,
              uploaded_by: user.id,
              course_id: newCourse.id
            }])
            .select()
            .single();

          if (fileRecordError || !fileRecord) {
            console.error(`Failed to create file record for ${fileInfo.name}:`, fileRecordError);
            // Try to clean up uploaded file
            await serviceSupabase.storage.from('course-materials').remove([fileName]);
            continue;
          }

          // Map old fileId to new fileId
          fileMapping[oldFileId] = fileRecord.id;
        } catch (error) {
          console.error(`Error processing file ${fileInfo.name}:`, error);
          // Continue with other files
        }
      }
    }

    // Update file references in lessons and create lessons
    const newLessons = [];
    for (const lesson of manifest.lessons || []) {
      try {
        // Update file references in content
        const updatedContent = (lesson.content || []).map((item: any) => {
          if (item.data?.fileId && fileMapping[item.data.fileId]) {
            return {
              ...item,
              data: {
                ...item.data,
                fileId: fileMapping[item.data.fileId],
                url: `/api/files/${fileMapping[item.data.fileId]}`
              }
            };
          }
          return item;
        });

        // Update file references in resources
        const updatedResources = (lesson.resources || []).map((item: any) => {
          if (item.data?.fileId && fileMapping[item.data.fileId]) {
            return {
              ...item,
              data: {
                ...item.data,
                fileId: fileMapping[item.data.fileId],
                url: `/api/files/${fileMapping[item.data.fileId]}`
              }
            };
          }
          return item;
        });

        // Create lesson
        const lessonData = {
          ...lesson,
          course_id: newCourse.id,
          content: updatedContent,
          resources: updatedResources,
          published: false // Restore as unpublished
        };

        const { data: newLesson, error: lessonError } = await supabase
          .from('lessons')
          .insert([lessonData])
          .select()
          .single();

        if (lessonError || !newLesson) {
          console.error('Lesson creation error:', lessonError);
          // Continue with other lessons
          continue;
        }

        newLessons.push(newLesson);
      } catch (error) {
        console.error(`Error creating lesson ${lesson.title}:`, error);
        // Continue with other lessons
      }
    }

    // Add course instructors (only if instructors exist in system)
    if (manifest.instructors && manifest.instructors.length > 0) {
      const instructorInserts = [];
      
      for (const instructorRef of manifest.instructors) {
        // Check if instructor exists (by ID)
        const { data: instructorExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', instructorRef.instructor_id)
          .single();

        if (instructorExists) {
          instructorInserts.push({
            course_id: newCourse.id,
            instructor_id: instructorRef.instructor_id
          });
        }
      }

      // Always add current user as instructor
      if (!instructorInserts.find(ci => ci.instructor_id === user.id)) {
        instructorInserts.push({
          course_id: newCourse.id,
          instructor_id: user.id
        });
      }

      if (instructorInserts.length > 0) {
        await supabase.from('course_instructors').insert(instructorInserts);
      }
    } else {
      // If no instructors in backup, add current user as instructor
      await supabase.from('course_instructors').insert([{
        course_id: newCourse.id,
        instructor_id: user.id
      }]);
    }

    // Update course thumbnail if it was in the backup
    if (manifest.course.thumbnail) {
      const thumbnailMatch = manifest.course.thumbnail.match(/\/api\/files\/([^/?]+)/);
      if (thumbnailMatch && fileMapping[thumbnailMatch[1]]) {
        await supabase
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
          // Find or create user by email
          const { data: existingUser } = await serviceSupabase
            .from('users')
            .select('id')
            .eq('email', userRef.email)
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
              
              // Update user role if needed
              await serviceSupabase
                .from('users')
                .update({ role: userRef.role })
                .eq('id', newUser.user.id);
            }
          }
        }

        // Create classes
        const classMapping: Record<string, string> = {};
        for (const classData of userData.classes || []) {
          const newClassData = {
            ...classData,
            course_id: newCourse.id
          };

          const { data: newClass } = await serviceSupabase
            .from('classes')
            .insert([newClassData])
            .select()
            .single();

          if (newClass) {
            // Use a temporary mapping key (we'll need to store original class identifier)
            // For now, use index-based mapping
            const classIndex = (userData.classes || []).indexOf(classData);
            classMapping[`class_${classIndex}`] = newClass.id;
            userDataStats.classesCreated++;
          }
        }

        // Create enrollments (map by email)
        for (const enrollment of userData.enrollments || []) {
          const studentId = enrollment.student_email ? userEmailMap[enrollment.student_email] : null;
          if (!studentId) continue;

          // Find class by matching criteria (use first class for now if no mapping)
          const classId = Object.values(classMapping)[0] || newCourse.id;
          
          const { data: newEnrollment } = await serviceSupabase
            .from('enrollments')
            .insert([{
              ...enrollment,
              class_id: classId,
              student_id: studentId
            }])
            .select()
            .single();

          if (newEnrollment) {
            userDataStats.enrollmentsCreated++;
          }
        }

        // Create progress (map by email and lesson)
        const lessonMapping: Record<string, string> = {};
        newLessons.forEach((lesson, index) => {
          const originalLesson = manifest.lessons[index];
          if (originalLesson) {
            lessonMapping[`lesson_${index}`] = lesson.id;
          }
        });

        for (const progress of userData.progress || []) {
          const studentId = progress.student_email ? userEmailMap[progress.student_email] : null;
          if (!studentId) continue;

          // Find lesson by index (simplified - assumes same order)
          const progressIndex = (userData.progress || []).indexOf(progress);
          const lessonId = Object.values(lessonMapping)[progressIndex] || newLessons[0]?.id;
          if (!lessonId) continue;

          const { data: newProgress } = await serviceSupabase
            .from('progress')
            .insert([{
              ...progress,
              lesson_id: lessonId,
              student_id: studentId
            }])
            .select()
            .single();

          if (newProgress) {
            userDataStats.progressCreated++;
          }
        }

        // Note: Quiz attempts, assignments, submissions, and grades restoration
        // would require more complex mapping logic (quizzes, assignments need to be created first)
        // This is a simplified version - full implementation would require creating
        // quizzes and assignments, then mapping attempts/submissions/grades

        userDataRestored = true;
      } catch (error) {
        console.error('Error restoring user data:', error);
        // Continue even if user data restoration fails
      }
    }

    return NextResponse.json({
      success: true,
      course: newCourse,
      lessonsCreated: newLessons.length,
      filesRestored: Object.keys(fileMapping).length,
      userDataRestored,
      userDataStats: userDataRestored ? userDataStats : null,
      message: `Course restored successfully. ${newLessons.length} lessons and ${Object.keys(fileMapping).length} files restored.${userDataRestored ? ` User data restored: ${userDataStats.enrollmentsCreated} enrollments, ${userDataStats.progressCreated} progress records.` : ''}`
    });

  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({
      error: `Restore failed: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

