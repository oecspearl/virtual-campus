import JSZip from "jszip";
import { parseString } from "xml2js";
import { promisify } from "util";
import type { MoodleBackupInfo, MoodleActivity, MoodleFile, MoodleCourse, MoodleSection } from "./types";
import { decodeHtmlEntities, getTextContent } from "./utils";

const parseXML = promisify(parseString);

/**
 * Parse moodle_backup.xml (master index)
 */
export async function parseMoodleBackupIndex(backupXml: string): Promise<{
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
export async function parseFilesXml(filesXml: string): Promise<Map<string, MoodleFile>> {
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
export async function parseSectionXml(sectionXml: string): Promise<{
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
export async function parseActivityContent(
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
export async function importActivityFiles(
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
export function getZipFile(zip: JSZip, path: string): JSZip.JSZipObject | null {
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
export async function verifyZipExtraction(zip: JSZip): Promise<{ success: boolean; error?: string }> {
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
export async function parseMoodleBackupZip(zip: JSZip): Promise<{
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
