import { describe, it, expect } from 'vitest';
import {
  mapLessonsForLlm,
  type LessonRow,
  type LessonConceptRow,
} from '../lesson-mapper';

// The mapper is the only place the DB schema vs LLM-shape impedance is
// resolved (difficulty bucketing, content_type translation, stand-ins for
// columns that don't exist yet). It's worth pinning the conversions before
// they get re-discovered the hard way during an LLM regression.

function row(overrides: Partial<LessonRow> = {}): LessonRow {
  return {
    id: 'lesson-1',
    course_id: 'course-1',
    title: 'A lesson',
    description: 'A description',
    learning_outcomes: ['outcome 1'],
    estimated_time: 30,
    difficulty: 3,
    content_type: 'rich_text',
    prerequisite_lesson_id: null,
    ...overrides,
  };
}

describe('mapLessonsForLlm — difficulty bucketing', () => {
  it('buckets 1 and 2 to "beginner"', () => {
    const [a] = mapLessonsForLlm({ lessons: [row({ difficulty: 1 })], lessonConcepts: [] });
    const [b] = mapLessonsForLlm({ lessons: [row({ difficulty: 2 })], lessonConcepts: [] });
    expect(a.difficulty).toBe('beginner');
    expect(b.difficulty).toBe('beginner');
  });

  it('buckets 3 to "intermediate"', () => {
    const [m] = mapLessonsForLlm({ lessons: [row({ difficulty: 3 })], lessonConcepts: [] });
    expect(m.difficulty).toBe('intermediate');
  });

  it('buckets 4 and 5 to "advanced"', () => {
    const [a] = mapLessonsForLlm({ lessons: [row({ difficulty: 4 })], lessonConcepts: [] });
    const [b] = mapLessonsForLlm({ lessons: [row({ difficulty: 5 })], lessonConcepts: [] });
    expect(a.difficulty).toBe('advanced');
    expect(b.difficulty).toBe('advanced');
  });

  it('defaults null/missing to "intermediate"', () => {
    const [m] = mapLessonsForLlm({ lessons: [row({ difficulty: null })], lessonConcepts: [] });
    expect(m.difficulty).toBe('intermediate');
  });
});

describe('mapLessonsForLlm — content_type translation', () => {
  it('maps the existing DB values to the spec enum', () => {
    const cases: Array<[LessonRow['content_type'], string]> = [
      ['video', 'video'],
      ['rich_text', 'reading'],
      ['scorm', 'interactive'],
      ['quiz', 'assessment'],
      ['assignment', 'assessment'],
    ];
    for (const [dbValue, expected] of cases) {
      const [m] = mapLessonsForLlm({
        lessons: [row({ content_type: dbValue })],
        lessonConcepts: [],
      });
      expect(m.contentType).toBe(expected);
    }
  });

  it('falls back to "mixed" for unrecognised values', () => {
    const [m] = mapLessonsForLlm({
      lessons: [row({ content_type: 'unknown' })],
      lessonConcepts: [],
    });
    expect(m.contentType).toBe('mixed');
  });
});

describe('mapLessonsForLlm — concept indexing', () => {
  it('splits topic vs prerequisite tags onto the right keys', () => {
    const concepts: LessonConceptRow[] = [
      { lesson_id: 'lesson-1', relation: 'topic', concepts: { slug: 'algorithms-basics' } },
      { lesson_id: 'lesson-1', relation: 'topic', concepts: { slug: 'data-structures-basics' } },
      { lesson_id: 'lesson-1', relation: 'prerequisite', concepts: { slug: 'programming-fundamentals' } },
    ];
    const [m] = mapLessonsForLlm({ lessons: [row()], lessonConcepts: concepts });
    expect(m.topicTags.sort()).toEqual(['algorithms-basics', 'data-structures-basics']);
    expect(m.prerequisites.conceptTags).toEqual(['programming-fundamentals']);
  });

  it('returns empty arrays for lessons with no concepts', () => {
    const [m] = mapLessonsForLlm({ lessons: [row()], lessonConcepts: [] });
    expect(m.topicTags).toEqual([]);
    expect(m.prerequisites.conceptTags).toEqual([]);
  });

  it('handles concepts returned as an array (PostgREST cardinality variation)', () => {
    const concepts: LessonConceptRow[] = [
      { lesson_id: 'lesson-1', relation: 'topic', concepts: [{ slug: 'machine-learning-fundamentals' }] },
    ];
    const [m] = mapLessonsForLlm({ lessons: [row()], lessonConcepts: concepts });
    expect(m.topicTags).toEqual(['machine-learning-fundamentals']);
  });

  it('skips rows where concepts is null', () => {
    const concepts: LessonConceptRow[] = [
      { lesson_id: 'lesson-1', relation: 'topic', concepts: null },
    ];
    const [m] = mapLessonsForLlm({ lessons: [row()], lessonConcepts: concepts });
    expect(m.topicTags).toEqual([]);
  });
});

describe('mapLessonsForLlm — prerequisites.lessonIds', () => {
  it('exposes the single FK as a one-element array', () => {
    const [m] = mapLessonsForLlm({
      lessons: [row({ prerequisite_lesson_id: 'lesson-prev' })],
      lessonConcepts: [],
    });
    expect(m.prerequisites.lessonIds).toEqual(['lesson-prev']);
  });

  it('returns an empty array when there is no prerequisite', () => {
    const [m] = mapLessonsForLlm({
      lessons: [row({ prerequisite_lesson_id: null })],
      lessonConcepts: [],
    });
    expect(m.prerequisites.lessonIds).toEqual([]);
  });
});

describe('mapLessonsForLlm — stand-in defaults', () => {
  it('synthesises a stable opaque slug from the lesson id', () => {
    const [m] = mapLessonsForLlm({ lessons: [row({ id: 'abc-123' })], lessonConcepts: [] });
    expect(m.slug).toBe('lesson-abc-123');
  });

  it('defaults language to "en" and pedagogicalRole to "core"', () => {
    const [m] = mapLessonsForLlm({ lessons: [row()], lessonConcepts: [] });
    expect(m.language).toBe('en');
    expect(m.pedagogicalRole).toBe('core');
  });

  it('coerces nullable description / learning_outcomes / estimated_time to safe defaults', () => {
    const [m] = mapLessonsForLlm({
      lessons: [row({ description: null, learning_outcomes: null, estimated_time: null })],
      lessonConcepts: [],
    });
    expect(m.description).toBe('');
    expect(m.learningObjectives).toEqual([]);
    expect(m.estimatedDurationMinutes).toBe(0);
  });
});
