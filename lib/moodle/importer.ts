import { NextResponse } from "next/server";
import JSZip from "jszip";
import { parseString } from "xml2js";
import { promisify } from "util";
import { createHash } from "crypto";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import type { MoodleActivity, MoodleFile, MoodleCourse, MoodleSection, AIImportResult } from "./types";
import { AI_MOODLE_PARSER_PROMPT } from "./types";
import { decodeHtmlEntities } from "./utils";
import { getZipFile, parseActivityContent, importActivityFiles, parseFilesXml } from "./parser";

const parseXML = promisify(parseString);

/**
 * Import Moodle activity into database
 */
export async function importMoodleActivityToDb(
  activity: MoodleActivity & { _parsedContent?: any[]; _description?: string; _contentType?: string },
  zip: JSZip,
  fileMap: Map<string, MoodleFile>,
  serviceSupabase: any,
  courseId: string,
  subjectId: string,
  order: number
): Promise<string | null> {
  try {
    // Get parsed content if available, otherwise parse now
    let lessonContent: any[] = [];
    let lessonDescription = '';
    let contentType = 'rich_text';

    if (activity._parsedContent) {
      lessonContent = activity._parsedContent;
      lessonDescription = activity._description || '';
      contentType = activity._contentType || 'rich_text';
    } else {
      // Parse activity XML
      const activityXmlFile = getZipFile(zip, `${activity.directory}/${activity.modulename}.xml`);
      if (!activityXmlFile) {
        console.warn(`Activity XML not found: ${activity.directory}/${activity.modulename}.xml`);
        return null;
      }

      let activityXml: string;
      try {
        activityXml = await activityXmlFile.async('string');
      } catch (error) {
        console.error(`Failed to extract activity XML from ${activity.directory}/${activity.modulename}.xml:`, error);
        return null;
      }

      if (!activityXml || activityXml.trim().length === 0) {
        console.warn(`Activity XML is empty: ${activity.directory}/${activity.modulename}.xml`);
        return null;
      }
      const parsed = await parseActivityContent(
        activityXml,
        activity.modulename,
        fileMap,
        zip,
        courseId,
        serviceSupabase
      );

      lessonContent = parsed.content;
      lessonDescription = parsed.description;
      contentType = parsed.contentType;
    }

    // Import files for resource/file activities
    if (activity.modulename === 'resource' || activity.modulename === 'file') {
      const inforefXmlFile = getZipFile(zip, `${activity.directory}/inforef.xml`);
      if (inforefXmlFile) {
        try {
          const inforefXml = await inforefXmlFile.async('string');
          if (inforefXml && inforefXml.trim().length > 0) {
            const fileReferences = await importActivityFiles(
              inforefXml,
              fileMap,
              zip,
              courseId,
              serviceSupabase
            );

            // Add file references to content
            lessonContent = [...lessonContent, ...fileReferences];
          }
        } catch (error) {
          console.error(`Failed to extract inforef.xml from ${activity.directory}:`, error);
        }
      }
    }

    // Create lesson
    const { data: lesson, error: lessonError } = await serviceSupabase
      .from('lessons')
      .insert({
        course_id: courseId,
        subject_id: subjectId,
        title: activity.title,
        description: lessonDescription,
        content: lessonContent,
        resources: [],
        order: order,
        content_type: contentType,
        published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (lessonError) {
      console.error(`Error creating lesson for ${activity.title}:`, lessonError);
      return null;
    }

    return lesson.id;
  } catch (error) {
    console.error(`Error importing activity ${activity.title}:`, error);
    return null;
  }
}

/**
 * Parse Moodle XML course file (not backup, but course XML export)
 */
export async function parseMoodleXmlCourse(xmlContent: string): Promise<MoodleCourse> {
  try {
    const courseData: any = await parseXML(xmlContent);

    if (!courseData.course || !courseData.course[0]) {
      throw new Error('Invalid Moodle XML course structure');
    }

    const courseXml = courseData.course[0];

    const course: MoodleCourse = {
      courseid: courseXml.id?.[0] || courseXml.courseid?.[0] || '',
      title: courseXml.fullname?.[0] || courseXml.title?.[0] || 'Imported Course',
      shortname: courseXml.shortname?.[0] || '',
      categoryid: courseXml.categoryid?.[0] || courseXml.category?.[0]?.$?.id || '',
      categoryname: courseXml.categoryname?.[0] || courseXml.category?.[0]?.$?.name || '',
      startdate: courseXml.startdate?.[0] || '',
      enddate: courseXml.enddate?.[0] || '',
      summary: decodeHtmlEntities(courseXml.summary?.[0] || courseXml.description?.[0] || ''),
      format: courseXml.format?.[0] || 'topics',
    };

    // Parse sections from XML
    if (courseXml.sections && courseXml.sections[0]?.section) {
      const sectionsData = Array.isArray(courseXml.sections[0].section)
        ? courseXml.sections[0].section
        : [courseXml.sections[0].section];

      course.sections = sectionsData.map((section: any, index: number) => {
        const sectionObj = Array.isArray(section) ? section[0] : section;

        const moodleSection: MoodleSection = {
          sectionid: sectionObj.id?.[0] || sectionObj.sectionid?.[0] || String(index),
          number: sectionObj.number?.[0] || String(index),
          name: sectionObj.name?.[0] || sectionObj.n?.[0] || sectionObj.summary?.[0] || `Section ${index + 1}`,
          summary: decodeHtmlEntities(sectionObj.summary?.[0] || ''),
          sequence: sectionObj.sequence?.[0] || '',
          visible: sectionObj.visible?.[0] || '1',
        };

        // Parse activities/modules in section
        if (sectionObj.modules && sectionObj.modules[0]?.module) {
          const modulesData = Array.isArray(sectionObj.modules[0].module)
            ? sectionObj.modules[0].module
            : [sectionObj.modules[0].module];

          moodleSection.activities = modulesData.map((module: any) => {
            const moduleObj = Array.isArray(module) ? module[0] : module;
            return {
              moduleid: moduleObj.id?.[0] || moduleObj.moduleid?.[0] || '',
              sectionid: moduleObj.sectionid?.[0] || moodleSection.sectionid,
              modulename: moduleObj.modulename?.[0] || moduleObj.type?.[0] || 'page',
              title: moduleObj.name?.[0] || moduleObj.n?.[0] || moduleObj.title?.[0] || 'Untitled Activity',
              directory: moduleObj.directory?.[0] || '',
            };
          });
        }

        return moodleSection;
      });
    }

    return course;
  } catch (error) {
    throw new Error(`Failed to parse Moodle XML course: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handle Moodle XML course import
 */
export async function handleMoodleXmlImport(
  file: File,
  courseName: string | null,
  serviceSupabase: any,
  authResult: any
): Promise<NextResponse> {
  try {
    const xmlContent = await file.text();

    if (!xmlContent || xmlContent.trim().length === 0) {
      return NextResponse.json({
        error: "The XML file is empty"
      }, { status: 400 });
    }

    // Parse XML course
    const moodleCourse = await parseMoodleXmlCourse(xmlContent);

    // Create course in database
    const courseTitle = courseName || moodleCourse.title;

    const { data: newCourse, error: courseError } = await serviceSupabase
      .from('courses')
      .insert({
        title: courseTitle,
        description: moodleCourse.summary || '',
        grade_level: moodleCourse.categoryname || '',
        subject_area: moodleCourse.shortname || '',
        published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (courseError) {
      console.error('Error creating course:', courseError);
      return NextResponse.json({
        error: "Failed to create course",
        details: courseError.message
      }, { status: 500 });
    }

    // Add current user as instructor
    await serviceSupabase
      .from('course_instructors')
      .insert({
        course_id: newCourse.id,
        instructor_id: authResult.user?.id
      });

    const importedLessons: string[] = [];
    const errors: string[] = [];

    // Import sections as subjects
    // Note: XML format doesn't include file contents, so we'll create structure only
    if (moodleCourse.sections) {
      for (let sectionIndex = 0; sectionIndex < moodleCourse.sections.length; sectionIndex++) {
        const section = moodleCourse.sections[sectionIndex];

        // Skip empty sections
        if (section.number === '0' && (!section.activities || section.activities.length === 0)) {
          continue;
        }

        // Create subject for section
        const { data: subject, error: subjectError } = await serviceSupabase
          .from('subjects')
          .insert({
            course_id: newCourse.id,
            title: section.name || `Section ${section.number}`,
            description: section.summary || '',
            order: sectionIndex,
            published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (subjectError) {
          errors.push(`Failed to create subject for section ${section.number}: ${subjectError.message}`);
          continue;
        }

        // Create lessons from activities (XML format has limited content, so we create placeholders)
        if (section.activities) {
          for (let activityIndex = 0; activityIndex < section.activities.length; activityIndex++) {
            const activity = section.activities[activityIndex];

            const { data: lesson, error: lessonError } = await serviceSupabase
              .from('lessons')
              .insert({
                course_id: newCourse.id,
                subject_id: subject.id,
                title: activity.title,
                description: `Imported from Moodle ${activity.modulename} activity`,
                content: [{
                  type: 'text',
                  title: 'Content',
                  data: `<p>This lesson was imported from Moodle. The original content type was: <strong>${activity.modulename}</strong>.</p><p>Please edit this lesson to add the actual content.</p>`
                }],
                resources: [],
                order: activityIndex,
                content_type: activity.modulename === 'quiz' ? 'quiz' :
                             activity.modulename === 'assignment' ? 'assignment' : 'rich_text',
                published: false, // Set to false so user can review and add content
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (lessonError) {
              errors.push(`Failed to create lesson for ${activity.title}: ${lessonError.message}`);
            } else {
              importedLessons.push(lesson.id);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      course: {
        id: newCourse.id,
        title: newCourse.title
      },
      imported: {
        subjects: moodleCourse.sections?.length || 0,
        lessons: importedLessons.length
      },
      errors: errors.length > 0 ? errors : undefined,
      note: "XML import creates course structure only. Please review and add content to lessons."
    });
  } catch (error) {
    console.error('Moodle XML import error:', error);
    return NextResponse.json({
      error: "Failed to import Moodle XML course",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Handle platform backup restore (manifest.json-based ZIP)
 */
export async function handlePlatformBackupRestore(
  zip: JSZip,
  authResult: any
): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();

  // Parse manifest
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    return NextResponse.json({ error: "Invalid backup file: manifest.json not found" }, { status: 400 });
  }

  const manifestContent = await manifestFile.async('string');
  let manifest: any;
  try {
    manifest = JSON.parse(manifestContent);
  } catch {
    return NextResponse.json({ error: "Invalid manifest.json format" }, { status: 400 });
  }

  if (!manifest.course || !manifest.version) {
    return NextResponse.json({ error: "Invalid backup format: missing required fields" }, { status: 400 });
  }

  console.log('[Platform Restore] Restoring course from platform backup:', manifest.course.title);

  // Check for duplicate course name
  const { data: existingCourse } = await supabase
    .from('courses')
    .select('id')
    .eq('title', manifest.course.title)
    .single();

  const courseTitle = existingCourse
    ? `${manifest.course.title} (Restored ${new Date().toISOString().split('T')[0]})`
    : manifest.course.title;

  // Create new course
  const newCourseData = {
    ...manifest.course,
    title: courseTitle,
    published: false,
    featured: false
  };

  const { data: newCourse, error: courseError } = await supabase
    .from('courses')
    .insert([newCourseData])
    .select()
    .single();

  if (courseError || !newCourse) {
    console.error('[Platform Restore] Course creation error:', courseError);
    return NextResponse.json({ error: `Failed to create course: ${courseError?.message}` }, { status: 500 });
  }

  // Upload files and create file mapping
  const fileMapping: Record<string, string> = {};
  const filesFolder = zip.folder('files');

  if (filesFolder && manifest.files) {
    for (const [oldFileId, fileInfo] of Object.entries(manifest.files as Record<string, { name: string; hash: string }>)) {
      try {
        const zipFile = filesFolder.file(fileInfo.name);
        if (!zipFile) {
          console.warn(`[Platform Restore] File ${fileInfo.name} not found in ZIP`);
          continue;
        }

        const fileBuffer = await zipFile.async('nodebuffer');
        const hash = createHash('sha256').update(fileBuffer).digest('hex');

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = fileInfo.name.split('.').pop() || 'bin';
        const fileName = `${timestamp}-${randomString}.${fileExtension}`;

        const { error: uploadError } = await serviceSupabase.storage
          .from('course-materials')
          .upload(fileName, fileBuffer, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`[Platform Restore] Failed to upload file ${fileInfo.name}:`, uploadError);
          continue;
        }

        const { data: urlData } = serviceSupabase.storage
          .from('course-materials')
          .getPublicUrl(fileName);

        const { data: fileRecord, error: fileRecordError } = await supabase
          .from('files')
          .insert([{
            name: fileInfo.name,
            type: 'application/octet-stream',
            size: fileBuffer.length,
            url: urlData.publicUrl,
            uploaded_by: authResult.user.id,
            course_id: newCourse.id
          }])
          .select()
          .single();

        if (fileRecordError || !fileRecord) {
          console.error(`[Platform Restore] Failed to create file record for ${fileInfo.name}:`, fileRecordError);
          await serviceSupabase.storage.from('course-materials').remove([fileName]);
          continue;
        }

        fileMapping[oldFileId] = fileRecord.id;
      } catch (error) {
        console.error(`[Platform Restore] Error processing file ${fileInfo.name}:`, error);
      }
    }
  }

  // Create lessons with updated file references
  const newLessons = [];
  for (const lesson of manifest.lessons || []) {
    try {
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

      const lessonData = {
        ...lesson,
        course_id: newCourse.id,
        content: updatedContent,
        resources: updatedResources,
        published: false
      };

      const { data: newLesson, error: lessonError } = await supabase
        .from('lessons')
        .insert([lessonData])
        .select()
        .single();

      if (lessonError || !newLesson) {
        console.error('[Platform Restore] Lesson creation error:', lessonError);
        continue;
      }

      newLessons.push(newLesson);
    } catch (error) {
      console.error(`[Platform Restore] Error creating lesson ${lesson.title}:`, error);
    }
  }

  // Add instructors
  if (manifest.instructors && manifest.instructors.length > 0) {
    const instructorInserts = [];
    for (const instructorRef of manifest.instructors) {
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

    if (!instructorInserts.find(ci => ci.instructor_id === authResult.user.id)) {
      instructorInserts.push({
        course_id: newCourse.id,
        instructor_id: authResult.user.id
      });
    }

    if (instructorInserts.length > 0) {
      await supabase.from('course_instructors').insert(instructorInserts);
    }
  } else {
    await supabase.from('course_instructors').insert([{
      course_id: newCourse.id,
      instructor_id: authResult.user.id
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

  console.log(`[Platform Restore] Successfully restored course: ${newCourse.title} (${newCourse.id})`);

  return NextResponse.json({
    success: true,
    course: {
      id: newCourse.id,
      title: newCourse.title
    },
    imported: {
      subjects: 0,
      lessons: newLessons.length
    },
    filesRestored: Object.keys(fileMapping).length,
    note: "Course restored from platform backup. Lessons are unpublished by default."
  });
}

/**
 * AI-powered Moodle backup import using OpenAI
 * Replaces fragile XML parsing with AI-based content extraction
 */
export async function handleAIMoodleImport(
  zip: JSZip,
  courseName: string | null,
  authResult: any,
  serviceSupabase: any
): Promise<NextResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      error: "AI import not available",
      details: "OPENAI_API_KEY environment variable is not configured."
    }, { status: 500 });
  }

  const errors: string[] = [];
  const stats = { subjects: 0, lessons: 0, quizzes: 0, assignments: 0, discussions: 0, files: 0 };

  try {
    console.log('[AI Import] Starting AI-powered Moodle import...');

    // ==============================
    // PHASE 1: Extract XML files
    // ==============================
    console.log('[AI Import] Phase 1: Extracting XML files from archive...');

    let xmlContext = '';
    let totalSize = 0;
    const MAX_CONTEXT = 280000;

    const addToContext = (label: string, content: string, maxLen = 30000): boolean => {
      const truncated = content.length > maxLen
        ? content.substring(0, maxLen) + '\n<!-- content truncated -->'
        : content;
      if (totalSize + truncated.length > MAX_CONTEXT) {
        console.log(`[AI Import] Skipping ${label} - context limit reached`);
        return false;
      }
      xmlContext += `\n=== ${label} ===\n${truncated}\n`;
      totalSize += truncated.length;
      return true;
    };

    // moodle_backup.xml (required)
    const backupXmlFile = getZipFile(zip, 'moodle_backup.xml');
    if (!backupXmlFile) {
      return NextResponse.json({ error: "moodle_backup.xml not found in archive" }, { status: 400 });
    }
    addToContext('moodle_backup.xml', await backupXmlFile.async('string'), 100000);

    // course/course.xml
    for (const tryPath of ['course/course.xml', 'course.xml']) {
      const f = getZipFile(zip, tryPath);
      if (f) {
        addToContext(tryPath, await f.async('string'));
        break;
      }
    }

    // Section XMLs
    const sectionPaths = Object.keys(zip.files)
      .filter(p => /sections\/section_\d+\/section\.xml$/.test(p))
      .sort();
    for (const path of sectionPaths) {
      const f = zip.files[path];
      if (f && !f.dir) {
        addToContext(path, await f.async('string'));
      }
    }

    // Activity XMLs (primary XML only - skip module.xml, inforef.xml, etc.)
    const skipActivityFiles = new Set([
      'module.xml', 'inforef.xml', 'grades.xml', 'grade_history.xml',
      'roles.xml', 'filters.xml', 'comments.xml', 'calendar.xml',
      'competencies.xml', 'grading.xml', 'completion.xml'
    ]);

    const activityPaths = Object.keys(zip.files)
      .filter(p => {
        if (!p.startsWith('activities/')) return false;
        const parts = p.split('/');
        if (parts.length !== 3) return false;
        return parts[2].endsWith('.xml') && !skipActivityFiles.has(parts[2]);
      })
      .sort();

    for (const path of activityPaths) {
      const f = zip.files[path];
      if (f && !f.dir) {
        if (!addToContext(path, await f.async('string'))) break;
      }
    }

    // questions.xml (for quiz questions)
    const questionsFile = getZipFile(zip, 'questions.xml');
    if (questionsFile) {
      addToContext('questions.xml', await questionsFile.async('string'), 60000);
    }

    console.log(`[AI Import] Extracted ${(totalSize / 1024).toFixed(1)}KB of XML context`);

    // ==============================
    // PHASE 2: Call OpenAI
    // ==============================
    console.log('[AI Import] Phase 2: Sending to OpenAI for parsing...');

    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userMessage = courseName
      ? `Parse this Moodle backup. Use "${courseName}" as the course name.\n\n${xmlContext}`
      : `Parse this Moodle backup. Use the course name from the backup.\n\n${xmlContext}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: AI_MOODLE_PARSER_PROMPT },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const aiContent = completion.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('OpenAI returned an empty response');
    }

    let aiResult: AIImportResult;
    try {
      aiResult = JSON.parse(aiContent);
    } catch {
      console.error('[AI Import] Failed to parse AI JSON:', aiContent.substring(0, 1000));
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    if (!aiResult.course || !aiResult.sections) {
      throw new Error('AI response missing required fields (course or sections)');
    }

    console.log('[AI Import] AI parsed successfully:', {
      courseTitle: aiResult.course.title,
      sections: aiResult.sections.length,
      totalActivities: aiResult.sections.reduce((sum, s) => sum + (s.activities?.length || 0), 0),
      warnings: aiResult.warnings?.length || 0
    });

    // ==============================
    // PHASE 3: Create database entities
    // ==============================
    console.log('[AI Import] Phase 3: Creating database entities...');

    // 3a. Create course
    const { data: newCourse, error: courseError } = await serviceSupabase
      .from('courses')
      .insert({
        title: courseName || aiResult.course.title || 'Imported Course',
        description: aiResult.course.description || '',
        subject_area: aiResult.course.subject_area || 'General',
        grade_level: aiResult.course.grade_level || 'Professional Development',
        published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (courseError || !newCourse) {
      console.error('[AI Import] Course creation error:', courseError);
      return NextResponse.json({
        error: "Failed to create course",
        details: courseError?.message || 'Unknown error'
      }, { status: 500 });
    }

    console.log('[AI Import] Course created:', newCourse.id, newCourse.title);

    // 3b. Add instructor
    const userId = authResult.user?.id || authResult.userProfile?.id;
    await serviceSupabase.from('course_instructors').insert({
      course_id: newCourse.id,
      instructor_id: userId
    });

    // 3c. Parse files.xml for file uploads later
    let fileMap = new Map<string, MoodleFile>();
    const filesXmlFile = getZipFile(zip, 'files.xml');
    if (filesXmlFile) {
      try {
        fileMap = await parseFilesXml(await filesXmlFile.async('string'));
        console.log('[AI Import] File map built:', fileMap.size, 'files');
      } catch (e) {
        console.warn('[AI Import] Failed to parse files.xml:', e);
      }
    }

    // 3d. Process each section
    for (const section of aiResult.sections) {
      // Create subject
      const { data: subject, error: subjectError } = await serviceSupabase
        .from('subjects')
        .insert({
          course_id: newCourse.id,
          title: section.title || `Section ${section.order + 1}`,
          description: section.description || '',
          order: section.order,
          published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (subjectError || !subject) {
        errors.push(`Failed to create subject "${section.title}": ${subjectError?.message}`);
        continue;
      }
      stats.subjects++;

      // Process activities
      for (const activity of (section.activities || [])) {
        try {
          let lessonContent: any[] = activity.content_blocks || [];

          // --- Quiz activities ---
          if (activity.moodle_type === 'quiz' && activity.quiz_data) {
            const qd = activity.quiz_data;
            const { data: quiz, error: quizError } = await serviceSupabase
              .from('quizzes')
              .insert({
                course_id: newCourse.id,
                title: activity.title,
                description: qd.description || '',
                time_limit: qd.time_limit_minutes || null,
                attempts_allowed: qd.attempts_allowed || 1,
                passing_score: 50,
                points: qd.points || 100,
                published: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (quizError || !quiz) {
              errors.push(`Failed to create quiz "${activity.title}": ${quizError?.message}`);
            } else {
              stats.quizzes++;
              // Create questions
              if (qd.questions?.length) {
                for (let qi = 0; qi < qd.questions.length; qi++) {
                  const q = qd.questions[qi];
                  await serviceSupabase.from('questions').insert({
                    quiz_id: quiz.id,
                    type: q.type || 'multiple_choice',
                    question_text: q.question_text || '',
                    points: q.points || 1,
                    order: qi,
                    options: q.options || [],
                    correct_answer: q.correct_answer || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                }
              }
              // Replace content with quiz reference block
              lessonContent = [{
                type: 'quiz',
                title: activity.title,
                data: {
                  quizId: quiz.id,
                  description: qd.description || '',
                  points: qd.points || 100,
                  timeLimit: qd.time_limit_minutes || null,
                  attemptsAllowed: qd.attempts_allowed || 1
                }
              }];
            }
          }

          // --- Assignment activities ---
          if (activity.moodle_type === 'assign' && activity.assignment_data) {
            const ad = activity.assignment_data;
            const { data: assignment, error: assignError } = await serviceSupabase
              .from('assignments')
              .insert({
                course_id: newCourse.id,
                title: activity.title,
                description: ad.description || '',
                due_date: ad.due_date || null,
                points: ad.points || 100,
                submission_types: ad.submission_types || ['file', 'text'],
                allow_late_submissions: true,
                published: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (assignError || !assignment) {
              errors.push(`Failed to create assignment "${activity.title}": ${assignError?.message}`);
            } else {
              stats.assignments++;
              lessonContent = [{
                type: 'assignment',
                title: activity.title,
                data: { assignmentId: assignment.id }
              }];
            }
          }

          // --- Forum activities → create discussion (no lesson) ---
          if (activity.moodle_type === 'forum' && activity.discussion_data) {
            const dd = activity.discussion_data;
            const { error: discError } = await serviceSupabase
              .from('course_discussions')
              .insert({
                course_id: newCourse.id,
                title: activity.title,
                content: dd.content || '',
                is_pinned: dd.is_pinned || false,
                published: true,
                author_id: userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (discError) {
              errors.push(`Failed to create discussion "${activity.title}": ${discError?.message}`);
            } else {
              stats.discussions++;
            }
            continue; // Forums become discussions, not lessons
          }

          // --- File uploads for resource activities ---
          if (activity.has_files && activity.activity_directory) {
            const inforefPath = `${activity.activity_directory}/inforef.xml`;
            const inforefFile = getZipFile(zip, inforefPath);
            if (inforefFile) {
              try {
                const inforefXml = await inforefFile.async('string');
                const fileRefs = await importActivityFiles(
                  inforefXml, fileMap, zip, newCourse.id, serviceSupabase
                );
                if (fileRefs.length > 0) {
                  lessonContent = [...lessonContent, ...fileRefs];
                  stats.files += fileRefs.length;
                }
              } catch (e) {
                console.warn(`[AI Import] File import failed for ${activity.title}:`, e);
              }
            }
          }

          // --- Create lesson ---
          const { error: lessonError } = await serviceSupabase
            .from('lessons')
            .insert({
              course_id: newCourse.id,
              subject_id: subject.id,
              title: activity.title || 'Untitled Lesson',
              description: '',
              content: lessonContent,
              resources: [],
              order: activity.order,
              published: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (lessonError) {
            errors.push(`Failed to create lesson "${activity.title}": ${lessonError?.message}`);
          } else {
            stats.lessons++;
          }
        } catch (actError) {
          const msg = actError instanceof Error ? actError.message : String(actError);
          errors.push(`Error processing "${activity.title}": ${msg}`);
        }
      }
    }

    // ==============================
    // PHASE 4: Return results
    // ==============================
    console.log('[AI Import] Import complete:', stats);

    return NextResponse.json({
      success: true,
      course: {
        id: newCourse.id,
        title: newCourse.title
      },
      imported: stats,
      errors: errors.length > 0 ? errors : undefined,
      warnings: aiResult.warnings?.length > 0 ? aiResult.warnings : undefined,
      note: "Course imported using AI-powered parsing. All content is unpublished for review."
    });

  } catch (error) {
    console.error('[AI Import] Error:', error);
    return NextResponse.json({
      error: "AI-powered import failed",
      details: error instanceof Error ? error.message : String(error),
      troubleshooting: [
        "Try again - AI processing can occasionally fail",
        "If the course is very large, some content may need to be imported manually",
        "Ensure your OPENAI_API_KEY is valid and has sufficient credits",
        "Contact support if the issue persists"
      ]
    }, { status: 500 });
  }
}
