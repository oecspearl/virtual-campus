import { z } from 'zod';

// Zod schema for CourseAssemblyResponse. This drives two things:
//   1. Structured output from the LLM (generateObject({ schema, ... }) hands
//      the schema to the provider — OpenAI as json_schema strict mode,
//      Anthropic as a forced-tool-use input schema — and refuses to return
//      anything that doesn't conform).
//   2. Defensive runtime validation. Even with strict mode, treat the LLM
//      as untrusted input — schema parse is the boundary.
//
// Field names match the spec (camelCase). The DB layer translates to
// snake_case when persisting to personalised_courses + personalised_course_lessons.

export const sequenceItemSchema = z.object({
  lessonId: z.string().describe('UUID of a lesson from selectedLessons.'),
  position: z.number().int().min(0).describe('Zero-indexed position in the sequence.'),
  rationale: z
    .string()
    .min(1)
    .describe('Brief justification for placing this lesson at this position.'),
  pathOutcomes: z
    .array(z.string())
    .describe(
      '3–5 learner-facing outcomes the learner should achieve from THIS lesson, framed by the path goal. Bloom-aligned verbs preferred. Independent of the lesson\'s own (course-context-agnostic) learning_outcomes.',
    ),
  pathInstructions: z
    .string()
    .describe(
      'A 2–4 sentence framing of how the learner should approach this lesson within the path: what to focus on, how it connects to surrounding lessons, what to take away.',
    ),
});

export const recommendedAdditionSchema = z.object({
  lessonId: z
    .string()
    .describe('UUID of a lesson from availableLessons (NOT selectedLessons).'),
  reason: z
    .string()
    .min(1)
    .describe('Why this addition would close a gap or strengthen the path.'),
  insertAfterPosition: z
    .number()
    .int()
    .min(-1)
    .describe(
      'Position in generatedSequence to insert after. Use -1 to insert at the very start.',
    ),
  pathOutcomes: z
    .array(z.string())
    .describe(
      'Same as sequence items: 3–5 outcomes for THIS lesson, framed by the path goal. Populated even on recommendations so they integrate seamlessly if the learner accepts.',
    ),
  pathInstructions: z
    .string()
    .describe('Same as sequence items: 2–4 sentence framing for this lesson.'),
});

export const courseAssemblySchema = z.object({
  courseTitle: z
    .string()
    .min(3)
    .max(200)
    .describe(
      'A short, descriptive title for the assembled path, framed by the learner\'s goal. Used as the course name. 3–200 chars.',
    ),
  courseDescription: z
    .string()
    .min(200)
    .max(3000)
    .describe(
      'A substantial, multi-paragraph course description (200–3000 chars, ~150–500 words) that BUILDS ON the learner\'s goal rather than just restating it. Take the goal as a starting point and add real substance: situate the path in its broader context, survey what the assembled lessons collectively cover, name the kinds of skills, concepts and decisions the learner will engage with, and motivate why this particular sequence serves the stated goal. Use plain prose with paragraph breaks (\\n\\n) where appropriate. Do NOT simply paraphrase the goal sentence.',
    ),
  generatedSequence: z
    .array(sequenceItemSchema)
    .describe(
      'The selected lessons sequenced in pedagogically sound order. Empty if the selection is incoherent — in that case populate flaggedConflicts with a clear explanation.',
    ),
  // The fields below are marked optional with safe defaults so the route
  // doesn't 503 when the model occasionally omits one. The core invariants
  // (courseTitle, courseDescription, generatedSequence) stay required.
  recommendedAdditions: z
    .array(recommendedAdditionSchema)
    .max(5)
    .default([])
    .describe(
      'Up to five additional lessons drawn from availableLessons that would close identified gaps.',
    ),
  flaggedGaps: z
    .array(z.string())
    .default([])
    .describe(
      'Concepts the learner needs but the assembled path does not cover. Use slugs from conceptTaxonomy where possible.',
    ),
  flaggedConflicts: z
    .array(z.string())
    .default([])
    .describe(
      'Sequencing or prerequisite conflicts. Each entry is a concise human-readable explanation.',
    ),
  generatedSyllabus: z
    .string()
    .default('')
    .describe('Markdown syllabus framing the path coherently for the learner.'),
  inferredObjectives: z
    .array(z.string())
    .default([])
    .describe(
      'Course-level learning objectives the assembled path will achieve. Bloom-aligned verbs preferred. Distinct from per-lesson pathOutcomes.',
    ),
});

export type CourseAssemblySchemaType = z.infer<typeof courseAssemblySchema>;
