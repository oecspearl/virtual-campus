// ─── Shared types for course detail components ─────────────────────────────

export interface CourseData {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  difficulty: string;
  subject_area: string | null;
  estimated_duration: string | null;
  modality: string;
  syllabus: string | null;
  course_format: string | null;
  start_date: string | null;
  grade_level?: string;
  published?: boolean;
  featured?: boolean;
}

export interface LessonData {
  id: string;
  title: string;
  description: string | null;
  order: number;
  estimated_time: number;
  content_type: string;
  published: boolean;
  completed?: boolean;
  section_id?: string | null;
  difficulty?: number;
  prerequisite_lesson_id?: string | null;
}

export interface SectionData {
  id: string;
  course_id?: string;
  title: string;
  description: string | null;
  order: number;
  start_date: string | null;
  end_date: string | null;
  collapsed?: boolean;
  published: boolean;
}

export interface QuizData {
  id: string;
  title: string;
  description: string | null;
  time_limit: number | null;
  passing_score: number | null;
  published: boolean;
}

export interface AssignmentData {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
  published: boolean;
  points?: number;
}

export interface DiscussionData {
  id: string;
  title: string;
  description: string | null;
  content?: string;
  is_graded: boolean;
  max_score: number | null;
  points?: number;
  due_date?: string | null;
  min_replies?: number;
}

export interface SurveyData {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  is_anonymous?: boolean;
  response_count?: number;
  has_responded?: boolean;
  can_respond?: boolean;
}

export interface ConferenceData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  meeting_url: string | null;
  video_provider: string;
  scheduled_at: string | null;
  instructor: { id: string; name: string; email: string } | null;
}

export interface InstructorData {
  id: string;
  name: string;
  email: string;
}

export interface ResourceLinkData {
  id: string;
  title: string;
  url: string;
  description: string | null;
  link_type: string;
  icon: string | null;
  order: number;
}

export interface RecordingData {
  id: string;
  recording_url: string;
  title: string | null;
  recording_duration: number | null;
  created_at: string;
  conference: { id: string; title: string; scheduled_at: string | null; course_id: string } | null;
}

export interface EnrollmentData {
  id: string;
  status: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
}

export interface LessonProgressData {
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at?: string | null;
}

/** Props shared by many course section components */
export interface CourseContextProps {
  courseId: string;
  course: CourseData;
  lessons: LessonData[];
  /** User role — null if unauthenticated */
  userRole: string | null;
  /** Whether user is enrolled */
  isEnrolled: boolean;
  /** Whether this is a shared (cross-tenant) course */
  isShared?: boolean;
}
