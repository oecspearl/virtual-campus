import { describe, it, expect } from 'vitest';
import {
  computeCourseGrade,
  assignLetter,
  type GradeCategory,
  type GradeItem,
  type StudentGrade,
} from '../gradebook-aggregation';

const cat = (overrides: Partial<GradeCategory>): GradeCategory => ({
  id: 'c',
  parent_id: null,
  name: 'cat',
  aggregation: 'weighted_mean',
  drop_lowest: 0,
  drop_highest: 0,
  keep_highest: null,
  weight: null,
  extra_credit: false,
  hidden: false,
  sort_order: 0,
  ...overrides,
});

const item = (overrides: Partial<GradeItem> & { id: string }): GradeItem => ({
  category_id: null,
  points: 100,
  weight: 1,
  extra_credit: false,
  hidden: false,
  locked: false,
  ...overrides,
});

const grade = (item_id: string, score: number, max = 100): StudentGrade => ({
  grade_item_id: item_id,
  score,
  max_score: max,
});

describe('computeCourseGrade — synthetic root (no categories defined)', () => {
  it('treats top-level items as a "sum" rollup', () => {
    const result = computeCourseGrade({
      categories: [],
      items: [item({ id: 'a' }), item({ id: 'b' })],
      grades: [grade('a', 80), grade('b', 90)],
    });
    // sum: 170 / 200 = 85
    expect(result.percentage).toBeCloseTo(85);
  });

  it('returns null percentage when no items are graded', () => {
    const result = computeCourseGrade({
      categories: [],
      items: [item({ id: 'a' })],
      grades: [],
    });
    expect(result.percentage).toBeNull();
  });
});

describe('aggregation strategies', () => {
  const root = cat({ id: 'root' });

  it('mean averages percentages', () => {
    const result = computeCourseGrade({
      categories: [cat({ id: 'root', aggregation: 'mean' })],
      items: [
        item({ id: 'a', category_id: 'root' }),
        item({ id: 'b', category_id: 'root', points: 50 }),
      ],
      grades: [grade('a', 80), grade('b', 25, 50)],
    });
    // (80 + 50) / 2 = 65
    expect(result.percentage).toBeCloseTo(65);
  });

  it('weighted_mean respects per-item weight', () => {
    const result = computeCourseGrade({
      categories: [cat({ id: 'root', aggregation: 'weighted_mean' })],
      items: [
        item({ id: 'a', category_id: 'root', weight: 3 }),
        item({ id: 'b', category_id: 'root', weight: 1 }),
      ],
      grades: [grade('a', 100), grade('b', 0)],
    });
    // (100*3 + 0*1) / 4 = 75
    expect(result.percentage).toBeCloseTo(75);
  });

  it('sum is points-based', () => {
    const result = computeCourseGrade({
      categories: [cat({ id: 'root', aggregation: 'sum' })],
      items: [
        item({ id: 'a', category_id: 'root', points: 40 }),
        item({ id: 'b', category_id: 'root', points: 60 }),
      ],
      grades: [grade('a', 30, 40), grade('b', 30, 60)],
    });
    // 60 / 100 = 60
    expect(result.percentage).toBeCloseTo(60);
  });

  it('max picks the best percentage', () => {
    const result = computeCourseGrade({
      categories: [cat({ id: 'root', aggregation: 'max' })],
      items: [item({ id: 'a', category_id: 'root' }), item({ id: 'b', category_id: 'root' })],
      grades: [grade('a', 50), grade('b', 90)],
    });
    expect(result.percentage).toBeCloseTo(90);
  });

  it('median takes the middle of an odd-length set', () => {
    const result = computeCourseGrade({
      categories: [cat({ id: 'root', aggregation: 'median' })],
      items: [
        item({ id: 'a', category_id: 'root' }),
        item({ id: 'b', category_id: 'root' }),
        item({ id: 'c', category_id: 'root' }),
      ],
      grades: [grade('a', 60), grade('b', 80), grade('c', 100)],
    });
    expect(result.percentage).toBeCloseTo(80);
  });
});

describe('drop rules', () => {
  it('drop_lowest removes the worst score before aggregating', () => {
    const result = computeCourseGrade({
      categories: [
        cat({ id: 'root', aggregation: 'mean', drop_lowest: 1 }),
      ],
      items: [
        item({ id: 'a', category_id: 'root' }),
        item({ id: 'b', category_id: 'root' }),
        item({ id: 'c', category_id: 'root' }),
      ],
      grades: [grade('a', 50), grade('b', 80), grade('c', 100)],
    });
    // drop 50 → mean(80, 100) = 90
    expect(result.percentage).toBeCloseTo(90);
  });

  it('keep_highest overrides drop_lowest', () => {
    const result = computeCourseGrade({
      categories: [
        cat({
          id: 'root',
          aggregation: 'mean',
          drop_lowest: 2,
          keep_highest: 1,
        }),
      ],
      items: [
        item({ id: 'a', category_id: 'root' }),
        item({ id: 'b', category_id: 'root' }),
        item({ id: 'c', category_id: 'root' }),
      ],
      grades: [grade('a', 60), grade('b', 80), grade('c', 100)],
    });
    expect(result.percentage).toBeCloseTo(100);
  });

  it('extra-credit items are never dropped', () => {
    const result = computeCourseGrade({
      categories: [
        cat({ id: 'root', aggregation: 'mean', drop_lowest: 1 }),
      ],
      items: [
        item({ id: 'a', category_id: 'root' }),
        item({ id: 'b', category_id: 'root' }),
        item({ id: 'ec', category_id: 'root', extra_credit: true }),
      ],
      // ec has the lowest %, but should not be dropped.
      grades: [grade('a', 60), grade('b', 100), grade('ec', 10)],
    });
    // After drop_lowest=1 on regulars: drop a(60). Keep b(100). Add ec(10).
    // mean strategy: base = 100 (only b regular), boost = 10 / 1 = 10 → 110
    expect(result.percentage).toBeCloseTo(110);
  });
});

describe('orphan items (null category_id)', () => {
  it('attaches orphan items to the single root when one exists', () => {
    const result = computeCourseGrade({
      categories: [cat({ id: 'root', aggregation: 'mean' })],
      items: [
        item({ id: 'in', category_id: 'root' }),
        // Newly-synced item that hasn't been categorised yet.
        item({ id: 'orphan', category_id: null as unknown as string }),
      ],
      grades: [grade('in', 80), grade('orphan', 100)],
    });
    // Both should count: mean(80, 100) = 90
    expect(result.percentage).toBeCloseTo(90);
  });

  it('surfaces orphans under root as a synthetic "Uncategorised" breakdown row', () => {
    const result = computeCourseGrade({
      categories: [
        cat({ id: 'root', aggregation: 'weighted_mean' }),
        cat({ id: 'a', parent_id: 'root', name: 'Assignments', aggregation: 'mean' }),
      ],
      items: [
        item({ id: 'a1', category_id: 'a' }),
        item({ id: 'a2', category_id: 'a' }),
        // Orphan item — gets rebucketed to root and should appear in
        // the breakdown alongside Assignments.
        item({ id: 'orphan', category_id: null as unknown as string }),
      ],
      grades: [grade('a1', 80), grade('a2', 100), grade('orphan', 50)],
    });
    expect(result.breakdown).toHaveLength(2);
    const names = result.breakdown.map((b) => b.name).sort();
    expect(names).toEqual(['Assignments', 'Uncategorised']);
  });

  it('falls through to the synthetic root when there are no categories at all', () => {
    const result = computeCourseGrade({
      categories: [],
      items: [
        item({ id: 'a', category_id: null as unknown as string, points: 50 }),
        item({ id: 'b', category_id: null as unknown as string, points: 50 }),
      ],
      grades: [grade('a', 40, 50), grade('b', 30, 50)],
    });
    // sum: 70/100 = 70
    expect(result.percentage).toBeCloseTo(70);
  });
});

describe('hierarchical categories', () => {
  it('rolls sub-categories up through the parent', () => {
    const result = computeCourseGrade({
      categories: [
        cat({ id: 'root', aggregation: 'weighted_mean' }),
        cat({
          id: 'quizzes',
          parent_id: 'root',
          aggregation: 'mean',
          weight: 1,
          name: 'Quizzes',
        }),
        cat({
          id: 'final',
          parent_id: 'root',
          aggregation: 'sum',
          weight: 3,
          name: 'Final',
        }),
      ],
      items: [
        item({ id: 'q1', category_id: 'quizzes' }),
        item({ id: 'q2', category_id: 'quizzes' }),
        item({ id: 'final', category_id: 'final', points: 200 }),
      ],
      grades: [grade('q1', 100), grade('q2', 0), grade('final', 200, 200)],
    });
    // Quizzes mean = 50, weight 1
    // Final sum = 100, weight 3
    // (50*1 + 100*3) / 4 = 87.5
    expect(result.percentage).toBeCloseTo(87.5);
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown.map((b) => b.name).sort()).toEqual([
      'Final',
      'Quizzes',
    ]);
  });

  it('skips ungraded items rather than treating them as zero', () => {
    const result = computeCourseGrade({
      categories: [cat({ id: 'root', aggregation: 'mean' })],
      items: [
        item({ id: 'a', category_id: 'root' }),
        item({ id: 'b', category_id: 'root' }),
      ],
      grades: [grade('a', 90)], // b is ungraded
    });
    expect(result.percentage).toBeCloseTo(90);
  });

  it('respects hidden flag on categories and items', () => {
    const result = computeCourseGrade({
      categories: [
        cat({ id: 'root', aggregation: 'mean' }),
        cat({
          id: 'staged',
          parent_id: 'root',
          aggregation: 'mean',
          hidden: true,
          name: 'Staged',
        }),
      ],
      items: [
        item({ id: 'shown', category_id: 'root' }),
        item({ id: 'hidden', category_id: 'root', hidden: true }),
        item({ id: 'staged-1', category_id: 'staged' }),
      ],
      grades: [
        grade('shown', 80),
        grade('hidden', 0),
        grade('staged-1', 0),
      ],
    });
    // Only `shown` (80) counts; hidden item and hidden sub-category excluded.
    expect(result.percentage).toBeCloseTo(80);
  });
});

describe('letter assignment', () => {
  const scale = [
    { letter: 'A', min_percentage: 90 },
    { letter: 'B', min_percentage: 80 },
    { letter: 'C', min_percentage: 70 },
    { letter: 'F', min_percentage: 0 },
  ];

  it('returns the highest band cleared', () => {
    expect(assignLetter(95, scale)).toBe('A');
    expect(assignLetter(85, scale)).toBe('B');
    expect(assignLetter(70, scale)).toBe('C');
    expect(assignLetter(0, scale)).toBe('F');
  });

  it('returns null without a scale', () => {
    expect(assignLetter(85, [])).toBeNull();
  });

  it('returns null when percentage is null', () => {
    expect(assignLetter(null, scale)).toBeNull();
  });
});
