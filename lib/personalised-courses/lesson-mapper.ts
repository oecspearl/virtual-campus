import type {
  LessonForLlm,
  LessonContentType,
  Difficulty,
} from './types';

// DB row → LessonForLlm mapper.
//
// The Lesson type the LLM sees (see ./types.ts) is rich and spec-shaped; the
// DB schema (see migration 002, augmented by 045) is thinner. This mapper is
// the only place that knowledge of which fields exist (and which are
// stand-in defaults) lives — everything downstream reasons over the spec
// shape.
//
// Stand-ins where the DB doesn't have the column yet:
//   * slug           — synthesised from the lesson id (stable, opaque, unique)
//   * language       — defaults to 'en'
//   * pedagogicalRole — defaults to 'core'
// When those columns are added later, only this file needs to change.

/**
 * Subset of the joined row shape we actually consume. Wider rows are fine —
 * we only read the keys listed here.
 */
export interface LessonRow {
  id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  learning_outcomes: string[] | null;
  estimated_time: number | null;
  difficulty: number | null;          // int 1–5 (see migration 002)
  content_type: string | null;        // 'rich_text' | 'video' | 'scorm' | 'quiz' | 'assignment'
  prerequisite_lesson_id: string | null;
}

export interface LessonConceptRow {
  lesson_id: string;
  relation: 'topic' | 'prerequisite';
  concepts: { slug: string } | { slug: string }[] | null;
}

/**
 * Group concept rows by lesson id and split by relation. Keeps the mapper
 * O(N+M) instead of doing a per-lesson filter inside a loop.
 */
function indexConcepts(
  rows: LessonConceptRow[],
): Map<string, { topic: string[]; prerequisite: string[] }> {
  const map = new Map<string, { topic: string[]; prerequisite: string[] }>();
  for (const row of rows) {
    if (!row.concepts) continue;
    // Supabase relational selects can return either an object or an array
    // depending on the relationship cardinality — concepts is a single
    // FK, so it's an object, but we accept both for safety.
    const slugs = Array.isArray(row.concepts)
      ? row.concepts.map((c) => c.slug)
      : [row.concepts.slug];

    let bucket = map.get(row.lesson_id);
    if (!bucket) {
      bucket = { topic: [], prerequisite: [] };
      map.set(row.lesson_id, bucket);
    }
    for (const slug of slugs) {
      if (row.relation === 'topic') bucket.topic.push(slug);
      else if (row.relation === 'prerequisite') bucket.prerequisite.push(slug);
    }
  }
  return map;
}

/**
 * Bucket the existing 1–5 int into the spec's three-level enum. Conservative:
 * 3 sits in the middle, edges go to the ends. We deliberately do NOT alter
 * the DB schema — see the risk discussion earlier in the build.
 */
function bucketDifficulty(level: number | null | undefined): Difficulty {
  if (level == null) return 'intermediate';
  if (level <= 2) return 'beginner';
  if (level >= 4) return 'advanced';
  return 'intermediate';
}

/**
 * Existing values: 'rich_text' | 'video' | 'scorm' | 'quiz' | 'assignment'.
 * Spec values:    'video' | 'reading' | 'interactive' | 'assessment' | 'mixed'.
 * Anything unrecognised falls back to 'mixed' so the LLM at least gets a
 * defined value.
 */
function mapContentType(value: string | null | undefined): LessonContentType {
  switch (value) {
    case 'video': return 'video';
    case 'rich_text': return 'reading';
    case 'scorm': return 'interactive';
    case 'quiz':
    case 'assignment': return 'assessment';
    default: return 'mixed';
  }
}

export interface MapLessonsInput {
  lessons: LessonRow[];
  /**
   * All lesson_concepts rows joined to concepts, for the lessons in
   * `lessons`. Pass an empty array if no concept tags are loaded — the
   * mapper degrades gracefully (empty topicTags / conceptTags).
   */
  lessonConcepts: LessonConceptRow[];
}

export function mapLessonsForLlm(input: MapLessonsInput): LessonForLlm[] {
  const conceptIndex = indexConcepts(input.lessonConcepts);

  return input.lessons.map((row) => {
    const concepts = conceptIndex.get(row.id) ?? { topic: [], prerequisite: [] };
    return {
      id: row.id,
      courseId: row.course_id ?? '',
      title: row.title,
      slug: `lesson-${row.id}`,
      description: row.description ?? '',
      learningObjectives: row.learning_outcomes ?? [],
      prerequisites: {
        lessonIds: row.prerequisite_lesson_id ? [row.prerequisite_lesson_id] : [],
        conceptTags: concepts.prerequisite,
      },
      difficulty: bucketDifficulty(row.difficulty),
      estimatedDurationMinutes: row.estimated_time ?? 0,
      topicTags: concepts.topic,
      contentType: mapContentType(row.content_type),
      language: 'en',
      pedagogicalRole: 'core',
    };
  });
}
