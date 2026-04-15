export type { CourseFormat } from '@/app/components/course/CourseFormatSelector';
export type { Section } from '@/app/components/course/SectionManager';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  estimated_time: number;
  difficulty: number;
  order: number;
  published: boolean;
  section_id?: string | null;
  class_id?: string | null;
  locked?: boolean;
  content_type?: string;
  prerequisite_lesson_id?: string | null;
}

export interface LessonProgress {
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at?: string | null;
}
