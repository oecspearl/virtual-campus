// ─── SCORM Builder Types ────────────────────────────────────────────────────

export interface SCORMSlide {
  id: string;
  title: string;
  /** HTML content for the slide body */
  html: string;
  /** Optional speaker/instructor notes */
  notes?: string;
  /** Quiz question attached to this slide (answered before advancing) */
  quiz?: SCORMQuizQuestion;
}

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank';

export interface MCQOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface SCORMQuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  /** MCQ options — only for type 'mcq' */
  options?: MCQOption[];
  /** Correct answer text — for true_false ('true'|'false') and fill_blank */
  answer?: string;
  /** Feedback shown after answering */
  feedback?: string;
  /** Points for this question */
  points: number;
}

export interface SCORMBuilderData {
  title: string;
  description?: string;
  /** The slides in order */
  slides: SCORMSlide[];
  /** Standalone quiz questions (shown after all slides) */
  quizQuestions: SCORMQuizQuestion[];
  /** Settings */
  settings: SCORMBuilderSettings;
}

export interface SCORMBuilderSettings {
  /** Passing score percentage (0-100) */
  passingScore: number;
  /** Allow learner to navigate freely between slides */
  freeNavigation: boolean;
  /** Show progress bar */
  showProgress: boolean;
  /** Theme colour for the generated player */
  accentColor: string;
}

export const DEFAULT_SETTINGS: SCORMBuilderSettings = {
  passingScore: 70,
  freeNavigation: true,
  showProgress: true,
  accentColor: '#1C8B63',
};
