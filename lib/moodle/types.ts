export interface MoodleBackupInfo {
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

export interface MoodleCourse {
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

export interface MoodleSection {
  sectionid: string;
  number: string;
  name: string;
  summary: string;
  sequence: string;
  visible: string;
  activities?: MoodleActivity[];
}

export interface MoodleActivity {
  moduleid: string;
  sectionid: string;
  modulename: string;
  title: string;
  directory: string;
}

export interface MoodleFile {
  id: string;
  filename: string;
  contenthash: string;
  mimetype: string;
  filesize: number;
}

// === AI Import Types ===
export interface AIQuizQuestion {
  type: string;
  question_text: string;
  points: number;
  options?: string[];
  correct_answer?: string;
}

export interface AIQuizData {
  description: string;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  points: number;
  questions: AIQuizQuestion[];
}

export interface AIAssignmentData {
  description: string;
  due_date: string | null;
  points: number;
  submission_types: string[];
}

export interface AIDiscussionData {
  content: string;
  is_pinned: boolean;
}

export interface AIContentBlock {
  type: string;
  title: string;
  data: Record<string, any>;
}

export interface AIActivity {
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

export interface AISection {
  title: string;
  description: string;
  order: number;
  activities: AIActivity[];
}

export interface AIImportResult {
  course: {
    title: string;
    description: string;
    subject_area: string;
    grade_level: string;
  };
  sections: AISection[];
  warnings: string[];
}

export const AI_MOODLE_PARSER_PROMPT = `You are a Moodle backup file parser. Given XML files extracted from a Moodle .mbz backup, parse them into a structured JSON object.

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
- page: Extract <content> HTML -> text block with data.html
- label: Extract <intro> HTML -> text block or label block
- url: Extract <externalurl> -> embed block with data.url
- resource: Set has_files=true, create text block noting the file attachment
- book: Create text blocks from content (one per chapter if available)
- quiz: Set quiz_data = { "description": "<intro> HTML", "time_limit_minutes": number|null, "attempts_allowed": number, "points": number, "questions": [...] }
  Questions schema: { "type": "multiple_choice|true_false|short_answer|essay", "question_text": "HTML", "points": number, "options": ["A","B","C","D"], "correct_answer": "answer text" }
  Moodle type mapping: multichoice->multiple_choice (correct answer has fraction="100"), truefalse->true_false, shortanswer->short_answer, essay->essay, numerical->short_answer, description->skip
- assign: Set assignment_data = { "description": "<intro> HTML", "due_date": "ISO-8601 or null", "points": number, "submission_types": ["file","text"] }
  Convert Unix timestamps (seconds since epoch) to ISO 8601
- forum: Set discussion_data = { "content": "<intro> HTML", "is_pinned": false }. Set is_pinned=true for news forum type
- h5pactivity, scorm, choice, googlemeet: Create text block describing the activity. Add a warning.

HTML RULES:
- Replace @@PLUGINFILE@@/filename with [FILE: filename] placeholder
- Strip Moodle CSS classes (atto_*, editor_atto_*)
- Preserve semantic HTML (headings, paragraphs, lists, tables, emphasis)
- Extract YouTube/Vimeo URLs from iframes -> create separate video blocks
- Fix double-encoded entities (&amp;amp; -> &amp;)

IMPORTANT:
- Skip section 0 (General) unless it has meaningful activities beyond just "Announcements" forum
- Sort activities by their order within the section sequence
- Set activity_directory from the XML file paths (e.g., if XML is "activities/page_12345/page.xml", directory is "activities/page_12345")
- Include warnings for unsupported content types or parsing issues`;
