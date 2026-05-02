// Types for the Personalised Course Builder LLM service layer.
//
// The shape here is the SPEC shape (see udl.md §3.1, §4.1) — camelCase, rich
// metadata. The DB layer uses snake_case columns and a thinner schema; the
// mapper that converts a row in `lessons` (+ joins) into a LessonForLlm lives
// in the Phase 4 controller, not here. Keeping this file LLM-shaped means the
// prompt template, the Zod schema, and the LLM provider all see exactly the
// vocabulary the spec describes — the DB schema is a separate concern.

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type LessonContentType =
  | 'video'
  | 'reading'
  | 'interactive'
  | 'assessment'
  | 'mixed';

export type PedagogicalRole =
  | 'introduction'
  | 'core'
  | 'practice'
  | 'assessment'
  | 'extension';

/**
 * A lesson as the LLM sees it. Rich enough that the model can reason about
 * sequencing, prerequisites, and pedagogical fit independently of which
 * course the lesson editorially belongs to.
 *
 * Mapping notes (DB → this shape, performed in the Phase 4 controller):
 *   - `difficulty`: the `lessons.difficulty` int (1–5) is bucketed
 *     (1–2 → beginner, 3 → intermediate, 4–5 → advanced).
 *   - `topicTags` / `prerequisites.conceptTags`: drawn from the
 *     `lesson_concepts` junction (relation = 'topic' / 'prerequisite').
 *   - `prerequisites.lessonIds`: today the DB has a single
 *     `lessons.prerequisite_lesson_id` column; expose it as a one-element
 *     array (or empty). A future migration may add a multi-prereq junction.
 *   - `language`, `slug`, `pedagogicalRole`: not yet present in the DB —
 *     the mapper supplies sensible defaults until they're added.
 */
export interface LessonForLlm {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  learningObjectives: string[];
  prerequisites: {
    lessonIds: string[];
    conceptTags: string[];
  };
  difficulty: Difficulty;
  estimatedDurationMinutes: number;
  topicTags: string[];
  contentType: LessonContentType;
  language: string;
  pedagogicalRole: PedagogicalRole;
}

export interface CourseAssemblyRequest {
  learnerGoal: string;
  selectedLessons: LessonForLlm[];
  /**
   * Catalogue of additional lessons the LLM may draw from when recommending
   * gap-filling additions. The caller is responsible for pre-filtering this
   * to the most relevant 200 (per spec §5.2). Sending the full catalogue is
   * wasteful and dilutes attention.
   */
  availableLessons: LessonForLlm[];
  /**
   * The controlled vocabulary of concept slugs the LLM is allowed to use
   * when discussing prerequisites and gaps. Keeps reasoning consistent
   * across calls.
   */
  conceptTaxonomy: string[];
}

export interface SequenceItem {
  lessonId: string;
  position: number;
  rationale: string;
}

export interface RecommendedAddition {
  lessonId: string;
  reason: string;
  insertAfterPosition: number;
}

export interface CourseAssemblyResponse {
  generatedSequence: SequenceItem[];
  recommendedAdditions: RecommendedAddition[];
  flaggedGaps: string[];
  flaggedConflicts: string[];
  generatedSyllabus: string;
  inferredObjectives: string[];
}

/**
 * Thrown by LLMService.assembleCourse when BOTH the primary and the
 * fallback provider have failed. The route handler catches this and
 * returns 503 with a "saved as draft, try again" message (spec §6.1).
 */
export class LLMUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LLMUnavailableError';
  }
}
