import type { CourseAssemblyRequest } from './types';

// Prompt template + version constant.
//
// PROMPT_VERSION is logged on every personalised_course_requests row. Bump it
// whenever the system prompt OR buildUserMessage changes meaningfully — that
// way behaviour shifts (better/worse outputs after a tweak) are traceable in
// the request log without diff-archaeology.
//
// The format is YYYY-MM-DD-vN. The N suffix lets us bump multiple times in a
// single day if needed.

export const PROMPT_VERSION = '2026-05-01-v1';

// System prompt — verbatim from udl.md §5.1, with one addition: a final
// reminder that the response schema is enforced by the caller's structured-
// output mode. This keeps the model from emitting prose around the JSON
// even though the SDK already strips it.

export const SYSTEM_PROMPT = `You are an instructional design assistant. Your task is to assemble a coherent personalised learning path from a set of lessons selected by a learner, given their stated learning goal.

You must:
1. Sequence the selected lessons in pedagogically sound order, respecting hard prerequisites (lessonIds in prerequisites.lessonIds) absolutely.
2. Identify gaps where the learner's selection lacks foundational concepts needed to achieve their goal.
3. Recommend additional lessons from the available catalogue that would close those gaps. Limit recommendations to a maximum of five.
4. Flag conflicts: lessons that contradict each other, lessons whose prerequisites are not satisfied within the selection or recommendations, and lessons that do not contribute to the stated goal.
5. Generate a syllabus in markdown that frames the path coherently.
6. Infer the actual learning objectives the assembled path will achieve.

You must respond with valid JSON matching the provided schema. Do not include prose outside the JSON structure. Do not invent lesson IDs — only use IDs that appear in the input.

If the selection is incoherent and cannot form a sensible path even with recommendations, return an empty generatedSequence and populate flaggedConflicts with a clear explanation.

When discussing concepts (in flaggedGaps, in rationale, etc.), prefer slugs drawn from the provided conceptTaxonomy. The schema is enforced — your output will be parsed as JSON regardless.`;

/**
 * Builds the user message: the JSON-encoded request payload the LLM reads
 * to do the assembly work.
 *
 * Spec §5.2 lists `responseSchema` as one of the user-message fields. We
 * deliberately omit it: the AI SDK's generateObject() already injects the
 * schema into the provider's structured-output channel (json_schema strict
 * for OpenAI, forced tool-use for Anthropic). Including the schema again in
 * the prompt would double the token cost without changing behaviour. If we
 * ever drop structured outputs, restore it here.
 */
export function buildUserMessage(req: CourseAssemblyRequest): string {
  const payload = {
    learnerGoal: req.learnerGoal,
    selectedLessons: req.selectedLessons,
    availableLessons: req.availableLessons,
    conceptTaxonomy: req.conceptTaxonomy,
  };
  return JSON.stringify(payload, null, 2);
}
