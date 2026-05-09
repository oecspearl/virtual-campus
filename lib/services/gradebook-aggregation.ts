/**
 * Gradebook aggregation engine — pure functions that roll up a student's
 * grade across a hierarchical category tree. Persistence is the caller's
 * job; this module never reads or writes Postgres.
 *
 * Data flow:
 *   1. Caller loads (categories, items, grades) for one (course, student).
 *   2. Caller passes them to `computeCourseGrade(...)`.
 *   3. Engine returns a CourseGradeResult — overall %, letter, per-category
 *      breakdown — which the caller persists to course_grade_summary.
 */

export type AggregationStrategy =
  | 'mean'
  | 'weighted_mean'
  | 'simple_weighted_mean'
  | 'sum'
  | 'max'
  | 'min'
  | 'median';

export interface GradeCategory {
  id: string;
  parent_id: string | null;
  name: string;
  aggregation: AggregationStrategy;
  drop_lowest: number;
  drop_highest: number;
  keep_highest: number | null;
  /** Weight in parent. Null = treated as 1.0. */
  weight: number | null;
  extra_credit: boolean;
  hidden: boolean;
  sort_order: number;
  /** Optional CSS hex display colour (#RRGGBB). Null = scale-driven. */
  display_color?: string | null;
}

export interface GradeItem {
  id: string;
  category_id: string | null;
  /** Max points possible. */
  points: number;
  /** Weight in category. Used by weighted_mean. */
  weight: number;
  extra_credit: boolean;
  hidden: boolean;
  /** Locked items still aggregate; the flag only blocks edits. */
  locked: boolean;
}

export interface StudentGrade {
  grade_item_id: string;
  /** Raw points scored. */
  score: number;
  /** Max points at the time of grading (may differ from item.points if rescaled). */
  max_score: number;
}

export interface LetterBand {
  letter: string;
  min_percentage: number;
}

export interface CategoryRollup {
  category_id: string;
  name: string;
  /** 0..100, may exceed 100 with extra credit. Null when no graded children. */
  percentage: number | null;
  /** Sum of points actually earned (helpful for "natural" / sum displays). */
  points: number;
  /** Sum of max points for the children that were counted. */
  max_points: number;
  /** True when at least one descendant produced a value. */
  graded: boolean;
  /** Display colour pulled from the category. Null = client falls back to scale-driven. */
  display_color?: string | null;
}

export interface CourseGradeResult {
  /** Overall course percentage. Null when there are no graded items at all. */
  percentage: number | null;
  /** Letter from the supplied scale, or null when no scale or no percentage. */
  letter: string | null;
  /** Top-level breakdown the UI renders as a row per category. */
  breakdown: CategoryRollup[];
}

// ─── Internal: child-set construction & drop rules ─────────────────────────

interface ChildValue {
  /** Percentage in [0, ∞). */
  percentage: number;
  /** Weight to use for weighted_mean. */
  weight: number;
  /** max_points contribution (used by simple_weighted_mean and sum). */
  maxPoints: number;
  /** Earned points (used by sum). */
  points: number;
  extraCredit: boolean;
}

/**
 * Apply drop_lowest / drop_highest / keep_highest. Extra-credit children
 * are never dropped (they only ever help the student).
 */
function applyDropRules(
  values: ChildValue[],
  category: Pick<GradeCategory, 'drop_lowest' | 'drop_highest' | 'keep_highest'>
): ChildValue[] {
  const ec = values.filter((v) => v.extraCredit);
  const regular = values.filter((v) => !v.extraCredit);

  // keep_highest wins over drop_lowest when both are set (Moodle semantics).
  if (category.keep_highest && category.keep_highest > 0) {
    const sorted = [...regular].sort((a, b) => b.percentage - a.percentage);
    return [...sorted.slice(0, category.keep_highest), ...ec];
  }

  let kept = [...regular].sort((a, b) => a.percentage - b.percentage);
  if (category.drop_lowest > 0) kept = kept.slice(category.drop_lowest);
  if (category.drop_highest > 0) {
    kept = kept.slice(0, Math.max(0, kept.length - category.drop_highest));
  }
  return [...kept, ...ec];
}

// ─── Internal: aggregation strategies ──────────────────────────────────────

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function aggregate(
  strategy: AggregationStrategy,
  values: ChildValue[]
): { percentage: number; points: number; maxPoints: number } | null {
  if (values.length === 0) return null;

  // Total earned/max across the kept set — used for breakdown display
  // regardless of strategy.
  const points = values.reduce((s, v) => s + v.points, 0);
  const maxPoints = values
    .filter((v) => !v.extraCredit)
    .reduce((s, v) => s + v.maxPoints, 0);

  let percentage: number;

  switch (strategy) {
    case 'mean': {
      const regular = values.filter((v) => !v.extraCredit);
      const ec = values.filter((v) => v.extraCredit);
      if (regular.length === 0) return null;
      const base =
        regular.reduce((s, v) => s + v.percentage, 0) / regular.length;
      const ecBoost = ec.reduce((s, v) => s + v.percentage / regular.length, 0);
      percentage = base + ecBoost;
      break;
    }
    case 'weighted_mean': {
      const regular = values.filter((v) => !v.extraCredit);
      const ec = values.filter((v) => v.extraCredit);
      const totalWeight = regular.reduce((s, v) => s + v.weight, 0);
      if (totalWeight <= 0) return null;
      const base =
        regular.reduce((s, v) => s + v.percentage * v.weight, 0) /
        totalWeight;
      const ecBoost = ec.reduce(
        (s, v) => s + (v.percentage * v.weight) / totalWeight,
        0
      );
      percentage = base + ecBoost;
      break;
    }
    case 'simple_weighted_mean': {
      // Like weighted_mean but using maxPoints instead of explicit weight.
      const regular = values.filter((v) => !v.extraCredit);
      const ec = values.filter((v) => v.extraCredit);
      const totalMax = regular.reduce((s, v) => s + v.maxPoints, 0);
      if (totalMax <= 0) return null;
      const base =
        regular.reduce((s, v) => s + v.percentage * v.maxPoints, 0) / totalMax;
      const ecBoost = ec.reduce(
        (s, v) => s + (v.percentage * v.maxPoints) / totalMax,
        0
      );
      percentage = base + ecBoost;
      break;
    }
    case 'sum': {
      // Moodle "natural" — sum of points / sum of max points. EC items add to
      // numerator without affecting denominator.
      if (maxPoints <= 0) return null;
      percentage = (points / maxPoints) * 100;
      break;
    }
    case 'max': {
      const regular = values.filter((v) => !v.extraCredit);
      if (regular.length === 0) return null;
      percentage = Math.max(...regular.map((v) => v.percentage));
      break;
    }
    case 'min': {
      const regular = values.filter((v) => !v.extraCredit);
      if (regular.length === 0) return null;
      percentage = Math.min(...regular.map((v) => v.percentage));
      break;
    }
    case 'median': {
      const regular = values.filter((v) => !v.extraCredit);
      if (regular.length === 0) return null;
      percentage = median(regular.map((v) => v.percentage));
      break;
    }
  }

  return { percentage, points, maxPoints };
}

// ─── Tree walk ─────────────────────────────────────────────────────────────

interface IndexedTree {
  byId: Map<string, GradeCategory>;
  childCategories: Map<string | null, GradeCategory[]>;
  childItems: Map<string | null, GradeItem[]>;
  gradesByItem: Map<string, StudentGrade>;
}

function indexInputs(
  categories: GradeCategory[],
  items: GradeItem[],
  grades: StudentGrade[]
): IndexedTree {
  const byId = new Map<string, GradeCategory>();
  const childCategories = new Map<string | null, GradeCategory[]>();
  const childItems = new Map<string | null, GradeItem[]>();
  const gradesByItem = new Map<string, StudentGrade>();

  for (const c of categories) {
    byId.set(c.id, c);
    const list = childCategories.get(c.parent_id) ?? [];
    list.push(c);
    childCategories.set(c.parent_id, list);
  }
  for (const list of childCategories.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  // When a course has categories defined, items with NULL category_id
  // (e.g. just-synced quiz/assignment rows that haven't been organised
  // into the tree yet) would otherwise be dropped from the calculation
  // — `rollupCategory` only ever looks at items keyed by an existing
  // category_id. Defensively re-bucket those orphans under the single
  // root category so they still count toward the rolled-up grade.
  // When there are zero or multiple roots, the existing
  // synthetic-root / multi-root logic in computeCourseGrade handles it.
  const rootCats = childCategories.get(null) ?? [];
  const singleRootId =
    rootCats.length === 1 && !rootCats[0].hidden ? rootCats[0].id : null;

  for (const i of items) {
    const bucketKey =
      i.category_id ?? (singleRootId ? singleRootId : null);
    const list = childItems.get(bucketKey) ?? [];
    list.push(i);
    childItems.set(bucketKey, list);
  }
  for (const g of grades) gradesByItem.set(g.grade_item_id, g);

  return { byId, childCategories, childItems, gradesByItem };
}

function rollupCategory(
  category: GradeCategory,
  tree: IndexedTree
): CategoryRollup {
  const childCats = tree.childCategories.get(category.id) ?? [];
  const childItems = (tree.childItems.get(category.id) ?? []).filter(
    (i) => !i.hidden
  );

  const childValues: ChildValue[] = [];

  // Recurse into sub-categories first.
  for (const sub of childCats) {
    if (sub.hidden) continue;
    const subRoll = rollupCategory(sub, tree);
    if (!subRoll.graded) continue;
    childValues.push({
      percentage: subRoll.percentage ?? 0,
      weight: sub.weight ?? 1.0,
      maxPoints: subRoll.max_points,
      points: subRoll.points,
      extraCredit: sub.extra_credit,
    });
  }

  // Then direct grade items.
  for (const item of childItems) {
    const grade = tree.gradesByItem.get(item.id);
    if (!grade) continue; // ungraded items are skipped, not zeroed
    const max = grade.max_score > 0 ? grade.max_score : item.points;
    if (max <= 0) continue;
    childValues.push({
      percentage: (grade.score / max) * 100,
      weight: item.weight,
      maxPoints: max,
      points: grade.score,
      extraCredit: item.extra_credit,
    });
  }

  if (childValues.length === 0) {
    return {
      category_id: category.id,
      name: category.name,
      percentage: null,
      points: 0,
      max_points: 0,
      graded: false,
      display_color: category.display_color ?? null,
    };
  }

  const kept = applyDropRules(childValues, category);
  const result = aggregate(category.aggregation, kept);

  if (!result) {
    return {
      category_id: category.id,
      name: category.name,
      percentage: null,
      points: 0,
      max_points: 0,
      graded: false,
    };
  }

  return {
    category_id: category.id,
    name: category.name,
    percentage: result.percentage,
    points: result.points,
    max_points: result.maxPoints,
    graded: true,
    display_color: category.display_color ?? null,
  };
}

// ─── Letter assignment ─────────────────────────────────────────────────────

export function assignLetter(
  percentage: number | null,
  scale: LetterBand[]
): string | null {
  if (percentage === null || scale.length === 0) return null;
  // Highest min_percentage band that the score clears wins.
  const sorted = [...scale].sort((a, b) => b.min_percentage - a.min_percentage);
  for (const band of sorted) {
    if (percentage >= band.min_percentage) return band.letter;
  }
  return null;
}

// ─── Public entry point ────────────────────────────────────────────────────

export interface ComputeCourseGradeInput {
  categories: GradeCategory[];
  items: GradeItem[];
  grades: StudentGrade[];
  letterScale?: LetterBand[];
}

/**
 * Roll up one student's grade across the full category tree.
 *
 * Conventions:
 *   - There must be exactly one root category per course (parent_id === null).
 *     If none exists, every top-level item is treated as belonging to a
 *     synthetic root with `aggregation = 'sum'` (Moodle "natural" default).
 *   - Hidden categories/items are excluded.
 *   - Ungraded items are skipped (NOT counted as zero). Treating ungraded
 *     work as zero is a course setting; if needed, the caller materialises
 *     a zero-grade row before calling this function.
 */
export function computeCourseGrade(
  input: ComputeCourseGradeInput
): CourseGradeResult {
  const tree = indexInputs(input.categories, input.items, input.grades);
  const roots = tree.childCategories.get(null) ?? [];

  // No category tree: synthesise a root that "sum"s everything top-level.
  if (roots.length === 0) {
    const synthetic: GradeCategory = {
      id: '__root__',
      parent_id: null,
      name: 'Course total',
      aggregation: 'sum',
      drop_lowest: 0,
      drop_highest: 0,
      keep_highest: null,
      weight: null,
      extra_credit: false,
      hidden: false,
      sort_order: 0,
    };
    // Re-point top-level items at the synthetic root.
    const orphanItems = (tree.childItems.get(null) ?? []).filter(
      (i) => !i.hidden
    );
    const adjusted = new Map(tree.childItems);
    adjusted.set(synthetic.id, orphanItems);
    const rolled = rollupCategory(synthetic, {
      ...tree,
      childItems: adjusted,
      childCategories: new Map(tree.childCategories).set(null, [synthetic]),
    });
    return {
      percentage: rolled.percentage,
      letter: assignLetter(rolled.percentage, input.letterScale ?? []),
      breakdown: [rolled],
    };
  }

  // Single root: roll up its children as the breakdown, and use the root's
  // own roll-up as the course percentage. Multi-root courses: aggregate
  // roots with a synthetic weighted_mean.
  if (roots.length === 1) {
    const root = roots[0];
    const rootRoll = rollupCategory(root, tree);
    const breakdown: CategoryRollup[] = [];
    const childCats = tree.childCategories.get(root.id) ?? [];
    for (const sub of childCats) {
      if (sub.hidden) continue;
      breakdown.push(rollupCategory(sub, tree));
    }
    return {
      percentage: rootRoll.percentage,
      letter: assignLetter(rootRoll.percentage, input.letterScale ?? []),
      breakdown,
    };
  }

  // Multiple roots — combine with weighted_mean.
  const rootRolls = roots
    .filter((r) => !r.hidden)
    .map((r) => ({ root: r, roll: rollupCategory(r, tree) }));
  const combinedValues: ChildValue[] = rootRolls
    .filter((r) => r.roll.graded)
    .map((r) => ({
      percentage: r.roll.percentage ?? 0,
      weight: r.root.weight ?? 1.0,
      maxPoints: r.roll.max_points,
      points: r.roll.points,
      extraCredit: r.root.extra_credit,
    }));
  const combined = aggregate('weighted_mean', combinedValues);
  return {
    percentage: combined?.percentage ?? null,
    letter: assignLetter(
      combined?.percentage ?? null,
      input.letterScale ?? []
    ),
    breakdown: rootRolls.map((r) => r.roll),
  };
}
