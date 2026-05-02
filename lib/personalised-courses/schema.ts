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
});

export const courseAssemblySchema = z.object({
  generatedSequence: z
    .array(sequenceItemSchema)
    .describe(
      'The selected lessons sequenced in pedagogically sound order. Empty if the selection is incoherent — in that case populate flaggedConflicts with a clear explanation.',
    ),
  recommendedAdditions: z
    .array(recommendedAdditionSchema)
    .max(5)
    .describe(
      'Up to five additional lessons drawn from availableLessons that would close identified gaps.',
    ),
  flaggedGaps: z
    .array(z.string())
    .describe(
      'Concepts the learner needs but the assembled path does not cover. Use slugs from conceptTaxonomy where possible.',
    ),
  flaggedConflicts: z
    .array(z.string())
    .describe(
      'Sequencing or prerequisite conflicts. Each entry is a concise human-readable explanation.',
    ),
  generatedSyllabus: z
    .string()
    .describe('Markdown syllabus framing the path coherently for the learner.'),
  inferredObjectives: z
    .array(z.string())
    .describe(
      'The actual learning objectives the assembled path will achieve. Bloom-aligned verbs preferred.',
    ),
});

export type CourseAssemblySchemaType = z.infer<typeof courseAssemblySchema>;
