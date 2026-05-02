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

// v3 (Phase 8.1): courseDescription expanded from a 2–4 sentence summary to
// a substantial multi-paragraph description that builds on the learner's
// goal rather than restating it. Adds ~500–1500 output tokens.
export const PROMPT_VERSION = '2026-05-02-v3';

export const SYSTEM_PROMPT = `You are an instructional design assistant. Your task is to assemble a coherent personalised course from a set of lessons selected by a learner, given their stated learning goal. Treat the output as a complete course-grade artefact, not just a sequence — the learner will study from it directly.

You must:
1. Produce a course-grade title (courseTitle) that names the assembled path in terms of the learner's goal. Also produce a SUBSTANTIAL courseDescription (~150–500 words, multiple paragraphs separated by \\n\\n). The learner's goal is your starting point — but do NOT merely restate or paraphrase it. Build on it: situate the path in its broader context, survey what the assembled lessons collectively cover at a higher level, name the kinds of skills, concepts and decisions the learner will engage with, and motivate why this particular sequence of lessons serves the stated goal. The description should read like a real course's "About this course" page — concrete and informative, drawing on the actual content of the selected lessons (not vague platitudes).
2. Sequence the selected lessons in pedagogically sound order, respecting hard prerequisites (lessonIds in prerequisites.lessonIds) absolutely.
3. For EVERY lesson in the sequence (and for every recommended addition), produce:
   - pathOutcomes: 3–5 learner-facing learning outcomes specific to this lesson's role in the path. These are independent of the lesson's own learning_outcomes — frame them by the path goal. Use Bloom-aligned verbs.
   - pathInstructions: a 2–4 sentence framing of how the learner should approach this lesson within the path: what to focus on, how it connects to surrounding lessons, what to take away.
4. Identify gaps where the learner's selection lacks foundational concepts needed to achieve their goal.
5. Recommend additional lessons from the available catalogue that would close those gaps. Limit recommendations to a maximum of five.
6. Flag conflicts: lessons that contradict each other, lessons whose prerequisites are not satisfied within the selection or recommendations, and lessons that do not contribute to the stated goal.
7. Generate a syllabus in markdown that frames the path coherently.
8. Infer the course-level learning objectives the assembled path will achieve (distinct from per-lesson pathOutcomes — these are the path's overarching objectives).

You must respond with valid JSON matching the provided schema. Do not include prose outside the JSON structure. Do not invent lesson IDs — only use IDs that appear in the input.

If the selection is incoherent and cannot form a sensible path even with recommendations, return an empty generatedSequence and populate flaggedConflicts with a clear explanation. (You must still provide a courseTitle and courseDescription that reflect the learner's stated goal — they're the user-facing summary even when the path failed.)

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
