'use client';

import React from 'react';

/**
 * Minimum shape the hook needs from each content item — only the `type`
 * is consulted (labels are never collapsed by `collapseAll`).
 */
export interface CollapsibleItem {
  type: string;
}

export interface UseCollapseStateResult {
  /** Set of indices currently collapsed. */
  collapsedItems: Set<number>;
  /** Toggle the collapse state of a single item. */
  toggleCollapse: (index: number) => void;
  /** Collapse every non-label item. */
  collapseAll: () => void;
  /** Expand everything. */
  expandAll: () => void;
  /** Whether the given index is currently collapsed. */
  isCollapsed: (index: number) => boolean;
  /** How many items are collapsible (i.e. not labels). */
  collapsibleCount: number;
  /** How many items are currently collapsed (excluding labels). */
  collapsedCount: number;
  /** True when every collapsible item is collapsed (false on empty content). */
  allCollapsed: boolean;
}

const STORAGE_PREFIX = 'lesson-collapsed-';

function readFromStorage(lessonId: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + lessonId);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((n): n is number => typeof n === 'number'));
  } catch (e) {
    console.error('useCollapseState: failed to load collapsed state', e);
  }
  return new Set();
}

function writeToStorage(lessonId: string, items: Set<number>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + lessonId, JSON.stringify(Array.from(items)));
  } catch (e) {
    console.error('useCollapseState: failed to save collapsed state', e);
  }
}

/**
 * Manages per-lesson collapsed-state for a list of content items, with
 * automatic localStorage persistence under `lesson-collapsed-<lessonId>`.
 * Loads on mount and writes back whenever the set changes.
 *
 * Labels (items with `type === 'label'`) are never collapsed by
 * `collapseAll` and are excluded from `collapsibleCount` / `collapsedCount`.
 */
export function useCollapseState(
  lessonId: string,
  content: readonly CollapsibleItem[]
): UseCollapseStateResult {
  const [collapsedItems, setCollapsedItems] = React.useState<Set<number>>(new Set());

  // Load from localStorage on mount and whenever lessonId changes
  React.useEffect(() => {
    setCollapsedItems(readFromStorage(lessonId));
  }, [lessonId]);

  // Persist changes back to localStorage
  React.useEffect(() => {
    writeToStorage(lessonId, collapsedItems);
  }, [collapsedItems, lessonId]);

  const toggleCollapse = React.useCallback((index: number) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const collapseAll = React.useCallback(() => {
    const indices = content
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.type !== 'label')
      .map(({ index }) => index);
    setCollapsedItems(new Set(indices));
  }, [content]);

  const expandAll = React.useCallback(() => {
    setCollapsedItems(new Set());
  }, []);

  const isCollapsed = React.useCallback(
    (index: number) => collapsedItems.has(index),
    [collapsedItems]
  );

  const collapsibleCount = React.useMemo(
    () => content.filter((item) => item.type !== 'label').length,
    [content]
  );

  const collapsedCount = React.useMemo(
    () =>
      Array.from(collapsedItems).filter((idx) => content[idx]?.type !== 'label').length,
    [collapsedItems, content]
  );

  const allCollapsed = collapsibleCount > 0 && collapsedCount === collapsibleCount;

  return {
    collapsedItems,
    toggleCollapse,
    collapseAll,
    expandAll,
    isCollapsed,
    collapsibleCount,
    collapsedCount,
    allCollapsed,
  };
}
