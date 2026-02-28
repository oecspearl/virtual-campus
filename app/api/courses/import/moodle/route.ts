import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import JSZip from "jszip";
import { parseString } from "xml2js";
import { promisify } from "util";
import { createHash } from "crypto";
import { gunzipSync } from "zlib";

export const maxDuration = 300; // 5 minutes

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_UNCOMPRESSED_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

const parseXML = promisify(parseString);

interface MoodleBackupInfo {
  moodle_version: string;
  moodle_release: string;
  backup_version: string;
  backup_release: string;
  backup_date: number;
  include_files: number;
  include_userdata: number;
  original_course_fullname: string;
  original_course_shortname: string;
}

interface MoodleCourse {
  courseid: string;
  title: string;
  shortname: string;
  categoryid: string;
  categoryname: string;
  startdate: string;
  enddate: string;
  summary: string;
  format: string;
  sections?: MoodleSection[];
}

interface MoodleSection {
  sectionid: string;
  number: string;
  name: string;
  summary: string;
  sequence: string;
  visible: string;
  activities?: MoodleActivity[];
}

interface MoodleActivity {
  moduleid: string;
  sectionid: string;
  modulename: string;
  title: string;
  directory: string;
}

interface MoodleFile {
  id: string;
  filename: string;
  contenthash: string;
  mimetype: string;
  filesize: number;
}

// === AI Import Types ===
interface AIQuizQuestion {
  type: string;
  question_text: string;
  points: number;
  options?: string[];
  correct_answer?: string;
}

interface AIQuizData {
  description: string;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  points: number;
  questions: AIQuizQuestion[];
}

interface AIAssignmentData {
  description: string;
  due_date: string | null;
  points: number;
  submission_types: string[];
}

interface AIDiscussionData {
  content: string;
  is_pinned: boolean;
}

interface AIContentBlock {
  type: string;
  title: string;
  data: Record<string, any>;
}

interface AIActivity {
  moodle_type: string;
  title: string;
  order: number;
  activity_directory?: string;
  content_blocks: AIContentBlock[];
  quiz_data?: AIQuizData | null;
  assignment_data?: AIAssignmentData | null;
  discussion_data?: AIDiscussionData | null;
  has_files?: boolean;
}

interface AISection {
  title: string;
  description: string;
  order: number;
  activities: AIActivity[];
}

interface AIImportResult {
  course: {
    title: string;
    description: string;
    subject_area: string;
    grade_level: string;
  };
  sections: AISection[];
  warnings: string[];
}

const AI_MOODLE_PARSER_PROMPT = `You are a Moodle backup file parser. Given XML files extracted from a Moodle .mbz backup, parse them into a structured JSON object.

Return ONLY valid JSON with this schema:
{
  "course": {
    "title": "string",
    "description": "string (clean HTML)",
    "subject_area": "string (from Moodle category, or 'General')",
    "grade_level": "Professional Development"
  },
  "sections": [
    {
      "title": "string (use 'Section N' if unnamed or '$@NULL@$')",
      "description": "string (section summary HTML)",
      "order": 0,
      "activities": [
        {
          "moodle_type": "page|quiz|assign|forum|resource|url|label|book|h5pactivity|googlemeet|choice|scorm",
          "title": "string",
          "order": 0,
          "activity_directory": "activities/type_id (from the XML file path)",
          "content_blocks": [
            { "type": "text", "title": "string", "data": { "html": "<p>content</p>" } }
          ],
          "quiz_data": null,
          "assignment_data": null,
          "discussion_data": null,
          "has_files": false
        }
      ]
    }
  ],
  "warnings": ["string"]
}

CONTENT BLOCK RULES:
- "text" block: { "type": "text", "title": "Title", "data": { "html": "<p>HTML content</p>" } }
- "video" block: { "type": "video", "title": "Title", "data": { "url": "youtube-or-vimeo-url" } }
- "embed" block: { "type": "embed", "title": "Title", "data": { "url": "external-url" } }
- "label" block: { "type": "label", "title": "Title", "data": { "text": "Label text", "style": "heading" } }

ACTIVITY TYPE MAPPING:
- page: Extract <content> HTML → text block with data.html
- label: Extract <intro> HTML → text block or label block
- url: Extract <externalurl> → embed block with data.url
- resource: Set has_files=true, create text block noting the file attachment
- book: Create text blocks from content (one per chapter if available)
- quiz: Set quiz_data = { "description": "<intro> HTML", "time_limit_minutes": number|null, "attempts_allowed": number, "points": number, "questions": [...] }
  Questions schema: { "type": "multiple_choice|true_false|short_answer|essay", "question_text": "HTML", "points": number, "options": ["A","B","C","D"], "correct_answer": "answer text" }
  Moodle type mapping: multichoice→multiple_choice (correct answer has fraction="100"), truefalse→true_false, shortanswer→short_answer, essay→essay, numerical→short_answer, description→skip
- assign: Set assignment_data = { "description": "<intro> HTML", "due_date": "ISO-8601 or null", "points": number, "submission_types": ["file","text"] }
  Convert Unix timestamps (seconds since epoch) to ISO 8601
- forum: Set discussion_data = { "content": "<intro> HTML", "is_pinned": false }. Set is_pinned=true for news forum type
- h5pactivity, scorm, choice, googlemeet: Create text block describing the activity. Add a warning.

HTML RULES:
- Replace @@PLUGINFILE@@/filename with [FILE: filename] placeholder
- Strip Moodle CSS classes (atto_*, editor_atto_*)
- Preserve semantic HTML (headings, paragraphs, lists, tables, emphasis)
- Extract YouTube/Vimeo URLs from iframes → create separate video blocks
- Fix double-encoded entities (&amp;amp; → &amp;)

IMPORTANT:
- Skip section 0 (General) unless it has meaningful activities beyond just "Announcements" forum
- Sort activities by their order within the section sequence
- Set activity_directory from the XML file paths (e.g., if XML is "activities/page_12345/page.xml", directory is "activities/page_12345")
- Include warnings for unsupported content types or parsing issues`;

/**
 * Decode HTML entities in XML content
 */
function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  // Replace common HTML entities
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Get text content from XML element, handling both <name> and <n> tags
 */
function getTextContent(data: any, path: string): string {
  if (!data) return '';
  
  const parts = path.split('.');
  let current = data;
  
  for (const part of parts) {
    if (!current || typeof current !== 'object') return '';
    
    // Handle array access
    if (Array.isArray(current)) {
      current = current[0];
      if (!current) return '';
    }
    
    // Try the path directly
    if (current[part] !== undefined) {
      current = current[part];
      continue;
    }
    
    // Try alternative names (e.g., 'n' instead of 'name')
    if (part === 'name' && current['n'] !== undefined) {
      current = current['n'];
      continue;
    }
    
    // Try with underscore (some XML parsers use _ for text content)
    if (current['_'] !== undefined) {
      current = current['_'];
      continue;
    }
    
    return '';
  }
  
  // Extract text from array if needed
  if (Array.isArray(current)) {
    const first = current[0];
    // Handle text content in XML2JS format
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && first['_']) return first['_'];
    return String(first || '');
  }
  
  // Handle text content in XML2JS format (text is in _ property)
  if (typeof current === 'object' && current !== null && current['_'] !== undefined) {
    return String(current['_']);
  }
  
  // If it's already a string, return it
  if (typeof current === 'string') {
    return current;
  }
  
  return String(current || '');
}

/**
 * Detect archive format (ZIP or TAR)
 */
async function detectArchiveFormat(buffer: Buffer): Promise<'zip' | 'tar' | 'gzip' | 'unknown'> {
  // GZIP files start with 0x1F 0x8B
  if (buffer[0] === 0x1F && buffer[1] === 0x8B) {
    return 'gzip';
  }

  // ZIP files start with PK (0x50 0x4B)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    return 'zip';
  }

  // TAR files: check for "ustar" at byte 257 (POSIX tar)
  if (buffer.length >= 263) {
    const tarCheck = buffer.slice(257, 263);
    const ustarSignature = tarCheck.toString('ascii');
    if (ustarSignature.startsWith('ustar')) {
      return 'tar';
    }
  }

  // Alternative TAR detection: check if first 512 bytes look like TAR header
  if (buffer.length >= 512) {
    const header = buffer.slice(0, 512);
    const nullCount = header.filter(b => b === 0).length;
    // TAR headers have many null bytes
    if (nullCount > 100 && nullCount < 400) {
      return 'tar';
    }
  }

  return 'unknown';
}

/**
 * Parse a TAR archive buffer into a map of filename -> content Buffer
 */
function parseTarArchive(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.slice(offset, offset + 512);

    // Check for end of archive (zero block)
    if (header.every(b => b === 0)) break;

    // Extract filename (bytes 0-99)
    let filename = header.slice(0, 100).toString('ascii').replace(/\0/g, '');

    // Check for ustar prefix (bytes 345-499) to extend filename
    const magic = header.slice(257, 263).toString('ascii').replace(/\0/g, '');
    if (magic.startsWith('ustar')) {
      const prefix = header.slice(345, 500).toString('ascii').replace(/\0/g, '');
      if (prefix) {
        filename = prefix + '/' + filename;
      }
    }

    // Extract file size (octal, bytes 124-135)
    const sizeStr = header.slice(124, 136).toString('ascii').replace(/\0/g, '').trim();
    const fileSize = parseInt(sizeStr, 8) || 0;

    // Type flag (byte 156): '0' or '\0' = regular file, '5' = directory
    const typeFlag = header[156];

    offset += 512; // Move past header

    // Only store regular files (type '0' = 48 or '\0' = 0)
    if ((typeFlag === 48 || typeFlag === 0) && fileSize > 0) {
      // Normalize path: strip leading ./ and /
      const normalizedPath = filename.replace(/^\.\//, '').replace(/^\//, '');
      const fileData = buffer.slice(offset, offset + fileSize);
      files.set(normalizedPath, fileData);
    }

    // Advance past file data, padded to 512-byte boundary
    offset += Math.ceil(fileSize / 512) * 512;
  }

  return files;
}

/**
 * Parse moodle_backup.xml (master index)
 */
async function parseMoodleBackupIndex(backupXml: string): Promise<{
  info: MoodleBackupInfo;
  sectionsIndex: Map<string, { title: string; directory: string }>;
  activitiesIndex: Map<string, MoodleActivity[]>;
  courseDirectory: string;
}> {
  let backupData: any;
  try {
    backupData = await parseXML(backupXml);
  } catch (error) {
    console.error('XML parsing error:', error);
    throw new Error(`Failed to parse moodle_backup.xml: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Log structure for debugging
  console.log('Backup XML structure keys:', Object.keys(backupData || {}));
  
  if (!backupData.moodle_backup) {
    console.error('Available keys in backupData:', Object.keys(backupData));
    throw new Error('Invalid moodle_backup.xml: missing moodle_backup element');
  }
  
  // Handle different XML structures - some versions use 'information', others use 'info'
  const info = backupData.moodle_backup.information?.[0] || backupData.moodle_backup.info?.[0];
  
  if (!info) {
    console.error('Available keys in moodle_backup:', Object.keys(backupData.moodle_backup));
    throw new Error('Invalid moodle_backup.xml: missing information or info element');
  }
  
  // Extract backup info
  const backupInfo: MoodleBackupInfo = {
    moodle_version: getTextContent(info, 'moodle_version') || '',
    moodle_release: getTextContent(info, 'moodle_release') || '',
    backup_version: getTextContent(info, 'backup_version') || '',
    backup_release: getTextContent(info, 'backup_release') || '',
    backup_date: parseInt(getTextContent(info, 'backup_date') || '0'),
    include_files: parseInt(getTextContent(info, 'include_files') || '0'),
    include_userdata: parseInt(getTextContent(info, 'include_userdata') || '0'),
    original_course_fullname: getTextContent(info, 'original_course_fullname') || '',
    original_course_shortname: getTextContent(info, 'original_course_shortname') || '',
  };
  
  // Build sections index
  const sectionsIndex = new Map<string, { title: string; directory: string }>();
  
  // Handle different XML structures - contents might be nested differently
  let contents = info.contents?.[0];
  if (!contents && info.contents) {
    contents = Array.isArray(info.contents) ? info.contents[0] : info.contents;
  }
  
  console.log('Contents structure:', contents ? Object.keys(contents) : 'null');
  
  if (contents && contents.sections) {
    const sectionsData = contents.sections[0]?.section || contents.sections.section;
    if (sectionsData) {
      const sections = Array.isArray(sectionsData)
        ? sectionsData
        : [sectionsData];
      
      sections.forEach((section: any) => {
      const sectionObj = Array.isArray(section) ? section[0] : section;
      const sectionId = getTextContent(sectionObj, 'sectionid');
      const title = getTextContent(sectionObj, 'title');
      const directory = getTextContent(sectionObj, 'directory');
      
      if (sectionId && directory) {
        sectionsIndex.set(sectionId, {
          title: title || '',
          directory: directory
        });
      }
    });
    }
  }
  
  // Build activities index grouped by section
  const activitiesIndex = new Map<string, MoodleActivity[]>();
  let courseDirectory = 'course';
  
  if (contents) {
    // Get course directory
    const courseData = contents.course?.[0] || contents.course;
    if (courseData) {
      courseDirectory = getTextContent(courseData, 'directory') || 'course';
    }
    
    // Process activities - handle different XML structures
    const activitiesData = contents.activities?.[0]?.activity || 
                          contents.activities?.activity ||
                          contents.activity;
    
    if (activitiesData) {
      const activities = Array.isArray(activitiesData)
        ? activitiesData
        : [activitiesData];
      
      activities.forEach((activity: any) => {
        const activityObj = Array.isArray(activity) ? activity[0] : activity;
        const sectionId = getTextContent(activityObj, 'sectionid');
        const moduleid = getTextContent(activityObj, 'moduleid');
        const modulename = getTextContent(activityObj, 'modulename');
        const title = getTextContent(activityObj, 'title');
        const directory = getTextContent(activityObj, 'directory');
        
        if (sectionId && moduleid && modulename && directory) {
          if (!activitiesIndex.has(sectionId)) {
            activitiesIndex.set(sectionId, []);
          }
          
          activitiesIndex.get(sectionId)!.push({
            moduleid,
            sectionid: sectionId,
            modulename,
            title: title || 'Untitled Activity',
            directory
          });
        }
      });
    }
  }
  
  return {
    info: backupInfo,
    sectionsIndex,
    activitiesIndex,
    courseDirectory
  };
}

/**
 * Parse files.xml to build file map
 */
async function parseFilesXml(filesXml: string): Promise<Map<string, MoodleFile>> {
  const fileMap = new Map<string, MoodleFile>();
  
  try {
    const filesData: any = await parseXML(filesXml);
    
    if (filesData.files && filesData.files.file) {
      const files = Array.isArray(filesData.files.file)
        ? filesData.files.file
        : [filesData.files.file];
      
      files.forEach((file: any) => {
        const fileObj = Array.isArray(file) ? file[0] : file;
        const id = fileObj.$?.id || getTextContent(fileObj, 'id') || '';
        const filename = getTextContent(fileObj, 'filename') || '';
        
        // Skip directory placeholders
        if (filename === '.' || !id) return;
        
        fileMap.set(id, {
          id,
          filename,
          contenthash: getTextContent(fileObj, 'contenthash') || '',
          mimetype: getTextContent(fileObj, 'mimetype') || 'application/octet-stream',
          filesize: parseInt(getTextContent(fileObj, 'filesize') || '0')
        });
      });
    }
  } catch (error) {
    console.warn('Failed to parse files.xml:', error);
  }
  
  return fileMap;
}

/**
 * Parse section XML
 */
async function parseSectionXml(sectionXml: string): Promise<{
  id: string;
  number: number;
  name: string;
  summary: string;
  sequence: string;
  visible: string;
}> {
  const sectionData: any = await parseXML(sectionXml);
  
  if (!sectionData.section || !sectionData.section[0]) {
    throw new Error('Invalid section.xml structure');
  }
  
  const section = sectionData.section[0];
  const id = section.$?.id || getTextContent(section, 'id') || '';
  
  // Get name - check both <name> and <n> tags
  let name = getTextContent(section, 'name');
  if (!name || name === '$@NULL@$') {
    name = getTextContent(section, 'n') || '';
  }
  
  return {
    id,
    number: parseInt(getTextContent(section, 'number') || '0'),
    name: name || '',
    summary: decodeHtmlEntities(getTextContent(section, 'summary') || ''),
    sequence: getTextContent(section, 'sequence') || '',
    visible: getTextContent(section, 'visible') || '1'
  };
}

/**
 * Parse activity XML and extract content
 */
async function parseActivityContent(
  activityXml: string,
  modulename: string,
  fileMap: Map<string, MoodleFile>,
  zip: JSZip,
  courseId: string,
  serviceSupabase: any
): Promise<{
  content: any[];
  description: string;
  contentType: string;
}> {
  const activityData: any = await parseXML(activityXml);
  
  if (!activityData.activity || !activityData.activity[0]) {
    throw new Error(`Invalid ${modulename}.xml structure`);
  }
  
  const activity = activityData.activity[0];
  const activityEl = activity[modulename]?.[0];
  
  if (!activityEl) {
    throw new Error(`No ${modulename} element found`);
  }
  
  // Get activity name (check both <name> and <n>)
  let activityName = getTextContent(activityEl, 'name');
  if (!activityName || activityName === '$@NULL@$') {
    activityName = getTextContent(activityEl, 'n') || '';
  }
  
  let lessonContent: any[] = [];
  let lessonDescription = '';
  let contentType = 'rich_text';
  
  switch (modulename) {
    case 'page':
      const pageContent = decodeHtmlEntities(getTextContent(activityEl, 'content') || '');
      lessonContent = [{
        type: 'text',
        title: activityName || 'Page Content',
        data: pageContent
      }];
      lessonDescription = pageContent.substring(0, 500);
      break;
      
    case 'url':
      const externalUrl = getTextContent(activityEl, 'externalurl') || '';
      const urlIntro = decodeHtmlEntities(getTextContent(activityEl, 'intro') || '');
      lessonContent = [{
        type: 'link',
        title: activityName || 'External Link',
        data: {
          url: externalUrl,
          description: urlIntro
        }
      }];
      lessonDescription = urlIntro;
      break;
      
    case 'resource':
    case 'file':
      const resourceIntro = decodeHtmlEntities(getTextContent(activityEl, 'intro') || '');
      lessonDescription = resourceIntro;
      
      // File references are in inforef.xml (will be handled separately)
      lessonContent = [{
        type: 'text',
        title: 'Resource',
        data: resourceIntro || '<p>File resource - files will be imported separately</p>'
      }];
      break;
      
    case 'forum':
      const forumIntro = decodeHtmlEntities(getTextContent(activityEl, 'intro') || '');
      lessonContent = [{
        type: 'text',
        title: activityName || 'Forum',
        data: forumIntro || '<p>Discussion forum</p>'
      }];
      lessonDescription = forumIntro;
      break;
      
    case 'quiz':
      const quizIntro = decodeHtmlEntities(getTextContent(activityEl, 'intro') || '');
      const timeLimit = parseInt(getTextContent(activityEl, 'timelimit') || '0');
      const attempts = parseInt(getTextContent(activityEl, 'attempts_number') || '1');
      
      lessonContent = [{
        type: 'quiz',
        title: activityName || 'Quiz',
        data: {
          description: quizIntro,
          timeLimit: timeLimit,
          attempts: attempts
        }
      }];
      lessonDescription = quizIntro;
      contentType = 'quiz';
      break;
      
    case 'assign':
      const assignIntro = decodeHtmlEntities(getTextContent(activityEl, 'intro') || '');
      const dueDate = getTextContent(activityEl, 'duedate') || '';
      const allowSubmissions = getTextContent(activityEl, 'allowsubmissionsfromdate') || '';
      
      lessonContent = [{
        type: 'assignment',
        title: activityName || 'Assignment',
        data: {
          description: assignIntro,
          dueDate: dueDate ? parseInt(dueDate) * 1000 : null, // Convert to milliseconds
          allowSubmissions: allowSubmissions ? parseInt(allowSubmissions) * 1000 : null
        }
      }];
      lessonDescription = assignIntro;
      contentType = 'assignment';
      break;
      
    case 'book':
      const bookIntro = decodeHtmlEntities(getTextContent(activityEl, 'intro') || '');
      lessonContent = [{
        type: 'text',
        title: activityName || 'Book',
        data: bookIntro || '<p>Book content - chapters may need to be imported separately</p>'
      }];
      lessonDescription = bookIntro;
      break;
      
    case 'label':
      const labelText = decodeHtmlEntities(getTextContent(activityEl, 'intro') || '');
      lessonContent = [{
        type: 'text',
        title: 'Label',
        data: labelText || '<p>Label content</p>'
      }];
      lessonDescription = labelText;
      break;
      
    default:
      const defaultIntro = decodeHtmlEntities(getTextContent(activityEl, 'intro') || '');
      lessonContent = [{
        type: 'text',
        title: activityName || 'Activity',
        data: defaultIntro || `<p>Imported ${modulename} activity</p>`
      }];
      lessonDescription = defaultIntro;
  }
  
  return {
    content: lessonContent,
    description: lessonDescription,
    contentType
  };
}

/**
 * Import files referenced by an activity
 */
async function importActivityFiles(
  inforefXml: string | null,
  fileMap: Map<string, MoodleFile>,
  zip: JSZip,
  courseId: string,
  serviceSupabase: any
): Promise<any[]> {
  const fileReferences: any[] = [];
  
  if (!inforefXml) return fileReferences;
  
  try {
    const inforefData: any = await parseXML(inforefXml);
    
    if (inforefData.inforef && inforefData.inforef.fileref) {
      const filerefs = Array.isArray(inforefData.inforef.fileref)
        ? inforefData.inforef.fileref
        : [inforefData.inforef.fileref];
      
      for (const fileref of filerefs) {
        const filerefObj = Array.isArray(fileref) ? fileref[0] : fileref;
        
        if (filerefObj.file) {
          const files = Array.isArray(filerefObj.file)
            ? filerefObj.file
            : [filerefObj.file];
          
          for (const file of files) {
            const fileObj = Array.isArray(file) ? file[0] : file;
            const fileId = getTextContent(fileObj, 'id') || '';
            
            if (!fileId) continue;
            
            const fileInfo = fileMap.get(fileId);
            if (!fileInfo) {
              console.warn(`File ID ${fileId} not found in files.xml`);
              continue;
            }
            
            // Extract file from ZIP
            // Files are stored as: files/{first2chars}/{contenthash}
            const hashPrefix = fileInfo.contenthash.substring(0, 2);
            const filePath = `files/${hashPrefix}/${fileInfo.contenthash}`;
            const fileEntry = getZipFile(zip, filePath);
            
            if (fileEntry) {
              try {
                // Extract binary file from ZIP
                const fileBuffer = await fileEntry.async('nodebuffer');
                
                // Verify file was extracted correctly
                if (!fileBuffer || fileBuffer.length === 0) {
                  console.warn(`File ${fileInfo.filename} extracted but is empty`);
                  continue;
                }
                
                // Verify file size matches expected size (allow some tolerance for compression)
                if (fileInfo.filesize > 0 && fileBuffer.length === 0) {
                  console.warn(`File ${fileInfo.filename} size mismatch: expected ${fileInfo.filesize}, got ${fileBuffer.length}`);
                }
                const fileExt = fileInfo.filename.split('.').pop()?.toLowerCase() || '';
                const storageFileId = crypto.randomUUID();
                const storagePath = `course-materials/${courseId}/${storageFileId}/${fileInfo.filename}`;
                
                const { error: uploadError } = await serviceSupabase.storage
                  .from('course-materials')
                  .upload(storagePath, fileBuffer, {
                    contentType: fileInfo.mimetype || 'application/octet-stream',
                    upsert: false
                  });
                
                if (!uploadError) {
                  const { data: { publicUrl } } = serviceSupabase.storage
                    .from('course-materials')
                    .getPublicUrl(storagePath);
                  
                  fileReferences.push({
                    type: 'file',
                    title: fileInfo.filename,
                    data: {
                      fileId: storageFileId,
                      name: fileInfo.filename,
                      url: publicUrl,
                      type: fileExt,
                      size: fileInfo.filesize
                    }
                  });
                } else {
                  console.error(`Failed to upload file ${fileInfo.filename}:`, uploadError);
                }
              } catch (error) {
                console.error(`Error extracting file ${fileInfo.filename}:`, error);
              }
            } else {
              console.warn(`File not found in ZIP: ${filePath}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to parse inforef.xml:', error);
  }
  
  return fileReferences;
}

/**
 * Helper function to safely get a file from ZIP (tries multiple path variations)
 */
function getZipFile(zip: JSZip, path: string): JSZip.JSZipObject | null {
  // Try exact path first
  let file = zip.file(path);
  if (file) return file;

  // Try with leading ./
  file = zip.file(`./${path}`);
  if (file) return file;

  // Try with leading slash
  file = zip.file(`/${path}`);
  if (file) return file;

  // Try without leading ./ or /
  const stripped = path.replace(/^\.\//, '').replace(/^\//, '');
  if (stripped !== path) {
    file = zip.file(stripped);
    if (file) return file;
  }

  return null;
}

/**
 * Verify ZIP extraction is working by testing a sample file
 */
async function verifyZipExtraction(zip: JSZip): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to extract moodle_backup.xml as a test
    const testFile = getZipFile(zip, 'moodle_backup.xml');
    if (!testFile) {
      return { success: false, error: 'moodle_backup.xml not found in ZIP' };
    }
    
    // Try to read it
    const content = await testFile.async('string');
    if (!content || content.trim().length === 0) {
      return { success: false, error: 'moodle_backup.xml is empty' };
    }
    
    // Verify it's valid XML
    if (!content.includes('<moodle_backup') && !content.includes('<?xml')) {
      return { success: false, error: 'moodle_backup.xml does not appear to be valid XML' };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `ZIP extraction test failed: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Parse Moodle backup (ZIP format)
 */
async function parseMoodleBackupZip(zip: JSZip): Promise<{
  info: MoodleBackupInfo;
  course: MoodleCourse;
  fileMap: Map<string, MoodleFile>;
}> {
  // Verify ZIP extraction is working
  const extractionTest = await verifyZipExtraction(zip);
  if (!extractionTest.success) {
    throw new Error(`ZIP extraction verification failed: ${extractionTest.error}`);
  }
  
  // Read moodle_backup.xml (master index)
  const backupFile = getZipFile(zip, 'moodle_backup.xml');
  if (!backupFile) {
    // List available files for debugging
    const availableFiles = Object.keys(zip.files).slice(0, 20);
    throw new Error(`moodle_backup.xml not found in backup. Available files (first 20): ${availableFiles.join(', ')}`);
  }
  
  let backupXml: string;
  try {
    backupXml = await backupFile.async('string');
  } catch (error) {
    throw new Error(`Failed to extract moodle_backup.xml from ZIP: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  if (!backupXml || backupXml.trim().length === 0) {
    throw new Error('moodle_backup.xml is empty or corrupted');
  }
  const { info, sectionsIndex, activitiesIndex, courseDirectory } = await parseMoodleBackupIndex(backupXml);
  
  // Read course/course.xml
  const courseFile = getZipFile(zip, `${courseDirectory}/course.xml`);
  if (!courseFile) {
    throw new Error(`${courseDirectory}/course.xml not found in backup`);
  }
  
  let courseXml: string;
  try {
    courseXml = await courseFile.async('string');
  } catch (error) {
    throw new Error(`Failed to extract course.xml from ZIP: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  if (!courseXml || courseXml.trim().length === 0) {
    throw new Error('course.xml is empty or corrupted');
  }
  const courseData: any = await parseXML(courseXml);
  
  if (!courseData.course || !courseData.course[0]) {
    throw new Error('Invalid course.xml structure');
  }
  
  const courseEl = courseData.course[0];
  
  // Get category name
  let categoryName = '';
  if (courseEl.category && courseEl.category[0]) {
    const category = Array.isArray(courseEl.category) ? courseEl.category[0] : courseEl.category[0];
    categoryName = getTextContent(category, 'name') || '';
  }
  
  const course: MoodleCourse = {
    courseid: courseEl.$?.id || getTextContent(courseEl, 'id') || '',
    title: getTextContent(courseEl, 'fullname') || info.original_course_fullname || 'Imported Course',
    shortname: getTextContent(courseEl, 'shortname') || info.original_course_shortname || '',
    categoryid: courseEl.category?.[0]?.$?.id || getTextContent(courseEl, 'categoryid') || '',
    categoryname: categoryName || '',
    startdate: getTextContent(courseEl, 'startdate') || '',
    enddate: getTextContent(courseEl, 'enddate') || '',
    summary: decodeHtmlEntities(getTextContent(courseEl, 'summary') || ''),
    format: getTextContent(courseEl, 'format') || 'topics',
    sections: []
  };
  
  // Parse files.xml
  const filesXmlFile = getZipFile(zip, 'files.xml');
  const fileMap = filesXmlFile
    ? await parseFilesXml(await filesXmlFile.async('string'))
    : new Map<string, MoodleFile>();
  
  // Process each section
  for (const [sectionId, sectionInfo] of sectionsIndex) {
    // Read section XML
    const sectionXmlFile = getZipFile(zip, `${sectionInfo.directory}/section.xml`);
    if (!sectionXmlFile) {
      console.warn(`Section XML not found: ${sectionInfo.directory}/section.xml`);
      continue;
    }
    
    let sectionXml: string;
    try {
      sectionXml = await sectionXmlFile.async('string');
    } catch (error) {
      console.error(`Failed to extract section XML from ${sectionInfo.directory}/section.xml:`, error);
      continue;
    }
    
    if (!sectionXml || sectionXml.trim().length === 0) {
      console.warn(`Section XML is empty: ${sectionInfo.directory}/section.xml`);
      continue;
    }
    const sectionData = await parseSectionXml(sectionXml);
    
    // Skip section 0 (intro) or sections without names
    if (sectionData.number === 0 || !sectionData.name || sectionData.name === '$@NULL@$') {
      continue;
    }
    
    const moodleSection: MoodleSection = {
      sectionid: sectionId,
      number: String(sectionData.number),
      name: sectionData.name,
      summary: sectionData.summary,
      sequence: sectionData.sequence,
      visible: sectionData.visible,
      activities: []
    };
    
    // Get activities for this section
    const sectionActivities = activitiesIndex.get(sectionId) || [];
    
    // Sort activities by sequence order
    const activityOrder = sectionData.sequence.split(',').filter(id => id.trim());
    sectionActivities.sort((a, b) => {
      const aIndex = activityOrder.indexOf(a.moduleid);
      const bIndex = activityOrder.indexOf(b.moduleid);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    
    // Process each activity
    for (const activityInfo of sectionActivities) {
      // Check visibility in module.xml
      const moduleXmlFile = getZipFile(zip, `${activityInfo.directory}/module.xml`);
      if (moduleXmlFile) {
        try {
          const moduleXml = await moduleXmlFile.async('string');
          if (moduleXml && moduleXml.trim().length > 0) {
            const moduleData: any = await parseXML(moduleXml);
            const visible = getTextContent(moduleData.module?.[0] || {}, 'visible');
            if (visible === '0') {
              continue; // Skip hidden activities
            }
          }
        } catch (error) {
          console.warn(`Failed to parse module.xml for ${activityInfo.directory}:`, error);
        }
      }
      
      // Parse activity XML
      const activityXmlFile = getZipFile(zip, `${activityInfo.directory}/${activityInfo.modulename}.xml`);
      if (!activityXmlFile) {
        console.warn(`Activity XML not found: ${activityInfo.directory}/${activityInfo.modulename}.xml`);
        continue;
      }
      
      try {
        const activityXml = await activityXmlFile.async('string');
        
        if (!activityXml || activityXml.trim().length === 0) {
          console.warn(`Activity XML is empty: ${activityInfo.directory}/${activityInfo.modulename}.xml`);
          continue;
        }
        const { content, description, contentType } = await parseActivityContent(
          activityXml,
          activityInfo.modulename,
          fileMap,
          zip,
          '', // courseId will be set later
          null as any // serviceSupabase will be set later
        );
        
        // Import files if this is a resource/file activity
        // Note: File import will happen later when we have courseId and serviceSupabase
        // For now, we'll store the activity info
        
        moodleSection.activities!.push({
          ...activityInfo,
          // Store parsed content for later use
          _parsedContent: content,
          _description: description,
          _contentType: contentType
        } as any);
      } catch (error) {
        console.error(`Error parsing activity ${activityInfo.title}:`, error);
      }
    }
    
    course.sections!.push(moodleSection);
  }
  
  // Sort sections by number
  course.sections!.sort((a, b) => parseInt(a.number) - parseInt(b.number));
  
  return { info, course, fileMap };
}

/**
 * Import Moodle activity into database
 */
async function importMoodleActivityToDb(
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
async function parseMoodleXmlCourse(xmlContent: string): Promise<MoodleCourse> {
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
async function handleMoodleXmlImport(
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
async function handlePlatformBackupRestore(
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
async function handleAIMoodleImport(
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

export async function POST(request: NextRequest) {
  try {
    console.log('[Moodle Import] Starting import request...');
    
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      console.error('[Moodle Import] Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    console.log('[Moodle Import] User authenticated:', userProfile.id, userProfile.role);

    // Check permissions
    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      console.error('[Moodle Import] Insufficient permissions:', userProfile.role);
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Determine request type: JSON (storage path) vs FormData (direct upload)
    const contentType = request.headers.get('content-type') || '';
    let file: File | null = null;
    let courseName: string | null = null;
    let buffer: Buffer | null = null;
    let fileName: string = '';

    if (contentType.includes('application/json')) {
      // New flow: file already uploaded to Supabase Storage
      const body = await request.json();
      const { storagePath, fileName: fn, courseName: cn } = body;
      courseName = cn || null;
      fileName = fn || '';

      if (!storagePath) {
        return NextResponse.json({ error: "No storagePath provided" }, { status: 400 });
      }

      console.log('[Moodle Import] Storage path mode:', { storagePath, fileName, courseName });

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await serviceSupabase.storage
        .from('course-materials')
        .download(storagePath);

      if (downloadError || !fileData) {
        console.error('[Moodle Import] Failed to download from storage:', downloadError);
        return NextResponse.json({
          error: "Failed to download uploaded file from storage",
          details: downloadError?.message || "File not found in storage"
        }, { status: 400 });
      }

      // Convert Blob to Buffer
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log('[Moodle Import] Downloaded from storage, size:', buffer.length,
        'firstBytes:', buffer.slice(0, 4).toString('hex'),
        'ascii:', buffer.slice(0, 20).toString('ascii').replace(/[^\x20-\x7E]/g, '.'));

      // Clean up temp file from storage (fire and forget)
      serviceSupabase.storage.from('course-materials').remove([storagePath]).catch(() => {});
    } else {
      // Legacy flow: file sent directly in FormData
      let formData: FormData;
      try {
        formData = await request.formData();
        console.log('[Moodle Import] Form data received');
      } catch (error) {
        console.error('[Moodle Import] Failed to parse form data:', error);
        return NextResponse.json({
          error: "Failed to parse form data",
          details: error instanceof Error ? error.message : "Could not read request body"
        }, { status: 400 });
      }

      file = formData.get('file') as File | null;
      courseName = formData.get('course_name') as string | null;

      if (!file) {
        return NextResponse.json({
          error: "No backup file provided",
          details: "Please select a backup file (.mbz, .zip, or .xml) to upload"
        }, { status: 400 });
      }

      fileName = file.name;
      console.log('[Moodle Import] File info:', { fileName: file.name, fileSize: file.size, fileType: file.type });

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          error: `Backup file too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024}MB.`
        }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Validate file type
    const isMbz = fileName.endsWith('.mbz') || fileName.endsWith('.zip');
    const isXml = fileName.endsWith('.xml');

    if (!isMbz && !isXml) {
      return NextResponse.json({
        error: "Backup file must be a .mbz, .zip, or .xml file",
        details: `The file "${fileName}" is not a supported format.`
      }, { status: 400 });
    }

    // Handle XML files differently from ZIP/MBZ files
    if (isXml) {
      // Create a File-like object for the XML handler
      const xmlContent = buffer!.toString('utf-8');
      const xmlFile = new File([xmlContent], fileName, { type: 'text/xml' });
      return await handleMoodleXmlImport(xmlFile, courseName, serviceSupabase, authResult);
    }

    // At this point buffer is guaranteed to be set
    if (!buffer) {
      return NextResponse.json({ error: "No file data available" }, { status: 400 });
    }

    console.log('[Moodle Import] Buffer ready, length:', buffer.length);

    // Validate file is not empty
    if (buffer.length === 0) {
      console.error('[Moodle Import] File is empty');
      return NextResponse.json({ 
        error: "The uploaded file is empty",
        details: "The file appears to have no content. Please check your Moodle backup file and try again."
      }, { status: 400 });
    }

    // Detect archive format
    let archiveFormat = await detectArchiveFormat(buffer);
    console.log('[Moodle Import] Detected archive format:', archiveFormat);

    // Handle gzip: decompress first, then re-detect inner format
    if (archiveFormat === 'gzip') {
      try {
        console.log('[Moodle Import] Decompressing gzip...');
        buffer = gunzipSync(buffer);
        console.log('[Moodle Import] Decompressed size:', buffer.length,
          'firstBytes:', buffer.slice(0, 4).toString('hex'));
        archiveFormat = await detectArchiveFormat(buffer);
        console.log('[Moodle Import] Inner format:', archiveFormat);
      } catch (error) {
        console.error('[Moodle Import] Gzip decompression failed:', error);
        return NextResponse.json({
          error: "Failed to decompress gzip file",
          details: "The .mbz file appears to be gzip-compressed but could not be decompressed. The file may be corrupted.",
          troubleshooting: [
            "Try re-downloading the backup from Moodle",
            "Verify the file wasn't corrupted during transfer"
          ]
        }, { status: 400 });
      }
    }

    // Handle TAR: parse and convert to JSZip-compatible structure
    let zip: JSZip;

    if (archiveFormat === 'tar') {
      try {
        console.log('[Moodle Import] Parsing TAR archive...');
        const tarFiles = parseTarArchive(buffer);
        console.log('[Moodle Import] TAR contains', tarFiles.size, 'files');

        // Populate a JSZip instance with TAR contents so downstream code works unchanged
        zip = new JSZip();
        for (const [path, data] of tarFiles) {
          zip.file(path, data);
        }

        const tarFileNames = Array.from(tarFiles.keys()).slice(0, 20);
        console.log('[Moodle Import] TAR file list (first 20):', tarFileNames);
      } catch (error) {
        console.error('[Moodle Import] TAR parsing failed:', error);
        return NextResponse.json({
          error: "Failed to parse TAR archive",
          details: "The Moodle backup TAR archive could not be read. The file may be corrupted.",
          troubleshooting: [
            "Try re-exporting the course from Moodle",
            "Verify the file wasn't corrupted during download"
          ]
        }, { status: 400 });
      }
    } else if (archiveFormat === 'zip') {
      // Log file info for debugging
      console.log('[Moodle Import] Loading ZIP archive, size:', buffer.length);

      try {
        zip = await JSZip.loadAsync(buffer, {
          checkCRC32: false,
          createFolders: true,
        });
      } catch (error) {
        const zipLoadError = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
          error: "Failed to read ZIP file",
          details: "The file could not be processed as a ZIP archive. Please ensure it's a valid Moodle backup file.",
          troubleshooting: [
            "Verify the file is a complete Moodle course backup (.mbz)",
            "Try re-exporting from Moodle",
            "Check that the file wasn't corrupted during upload",
            "Ensure the file is not password-protected"
          ],
          technical: zipLoadError.message
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        error: "Unknown archive format",
        details: "The file does not appear to be a valid ZIP, TAR, or gzip archive. Please ensure you're uploading a complete Moodle backup file."
      }, { status: 400 });
    }
    
    // Verify ZIP has files
    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      return NextResponse.json({ 
        error: "The ZIP file is empty",
        details: "The uploaded file appears to be an empty ZIP archive. Please ensure you're uploading a complete Moodle backup."
      }, { status: 400 });
    }
    
    // Log ZIP structure for debugging
    const xmlFiles = Object.keys(zip.files).filter(path => path.endsWith('.xml'));
    const binaryFiles = Object.keys(zip.files).filter(path => 
      path.startsWith('files/') && !path.endsWith('.xml')
    );
    const mbzFiles = Object.keys(zip.files).filter(path => path.endsWith('.mbz'));
    const nestedZipFiles = Object.keys(zip.files).filter(path => 
      path.endsWith('.zip') && !path.endsWith('.mbz.zip')
    );
    
    console.log(`ZIP loaded successfully. Contains ${fileCount} files/entries:`);
    console.log(`  - ${xmlFiles.length} XML files`);
    console.log(`  - ${binaryFiles.length} binary files in files/ directory`);
    console.log(`  - ${mbzFiles.length} .mbz files (nested)`);
    console.log(`  - ${nestedZipFiles.length} .zip files (nested)`);
    console.log(`  - Required file 'moodle_backup.xml': ${getZipFile(zip, 'moodle_backup.xml') ? 'found' : 'missing'}`);
    console.log(`  - All files in ZIP:`, Object.keys(zip.files).slice(0, 20));
    
    // Check if this is a nested ZIP (ZIP containing a .mbz file)
    if ((mbzFiles.length > 0 || nestedZipFiles.length > 0) && !getZipFile(zip, 'moodle_backup.xml')) {
      console.log('[Moodle Import] Detected nested ZIP/MBZ file. Attempting to extract...');
      
      // Try to extract the nested .mbz or .zip file
      const nestedFile = mbzFiles[0] || nestedZipFiles[0];
      if (nestedFile) {
        try {
          const nestedFileEntry = getZipFile(zip, nestedFile);
          if (nestedFileEntry) {
            console.log(`[Moodle Import] Extracting nested file: ${nestedFile}`);
            const nestedBuffer = await nestedFileEntry.async('nodebuffer');
            console.log(`[Moodle Import] Nested file extracted, size: ${nestedBuffer.length}`);
            
            // Load the nested ZIP
            try {
              zip = await JSZip.loadAsync(nestedBuffer, {
                checkCRC32: false,
                createFolders: true
              });
              
              const nestedFileCount = Object.keys(zip.files).length;
              const nestedXmlFiles = Object.keys(zip.files).filter(path => path.endsWith('.xml'));
              console.log(`[Moodle Import] Nested ZIP loaded successfully. Contains ${nestedFileCount} files:`);
              console.log(`  - ${nestedXmlFiles.length} XML files`);
              console.log(`  - All files in nested ZIP:`, Object.keys(zip.files).slice(0, 20));
            } catch (nestedError) {
              console.error('[Moodle Import] Failed to load nested ZIP:', nestedError);
              return NextResponse.json({
                error: "Failed to extract nested Moodle backup",
                details: "The file contains a nested ZIP/MBZ file, but it could not be extracted. The nested file may be corrupted.",
                troubleshooting: [
                  "Try extracting the outer ZIP file manually",
                  "Upload the inner .mbz file directly (not the .zip containing it)",
                  "Re-export from Moodle ensuring you download the .mbz file directly"
                ]
              }, { status: 400 });
            }
          }
        } catch (extractError) {
          console.error('[Moodle Import] Failed to extract nested file:', extractError);
          return NextResponse.json({
            error: "Failed to extract nested Moodle backup",
            details: "The file appears to contain a nested ZIP/MBZ file, but extraction failed.",
            troubleshooting: [
              "Extract the outer ZIP file manually first",
              "Upload the inner .mbz file directly",
              "Re-export from Moodle"
            ]
          }, { status: 400 });
        }
      }
    }
    
    // Detect platform backup format (manifest.json instead of moodle_backup.xml)
    const manifestJsonFile = zip.file('manifest.json');
    if (manifestJsonFile && !getZipFile(zip, 'moodle_backup.xml')) {
      console.log('[Moodle Import] Detected platform backup format (manifest.json). Routing to platform restore...');
      return await handlePlatformBackupRestore(zip, authResult);
    }

    // Verify ZIP structure - check for required Moodle files
    const requiredFiles = ['moodle_backup.xml'];
    const missingFiles = requiredFiles.filter(file => !getZipFile(zip, file));

    if (missingFiles.length > 0) {
      console.warn(`Missing required files in ZIP: ${missingFiles.join(', ')}`);
      // Don't fail immediately - might be in a subdirectory
    }

    // Use AI-powered import for reliable Moodle backup parsing
    return await handleAIMoodleImport(zip, courseName, authResult, serviceSupabase);

  } catch (error) {
    console.error('[Moodle Import] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details
    console.error('[Moodle Import] Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    });
    
    // Determine if this is a client error (400) or server error (500)
    const isClientError = errorMessage.includes('validation') || 
                         errorMessage.includes('invalid') ||
                         errorMessage.includes('missing') ||
                         errorMessage.includes('required');
    
    return NextResponse.json({
      error: "Failed to import Moodle backup",
      details: errorMessage,
      troubleshooting: [
        "Check that the file is a valid Moodle backup",
        "Ensure the file upload completed successfully",
        "Try re-exporting from Moodle",
        "Contact support if the issue persists"
      ]
    }, { status: isClientError ? 400 : 500 });
  }
}