// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCollapseState, type CollapsibleItem } from '../useCollapseState';

beforeEach(() => {
  window.localStorage.clear();
});

const CONTENT: CollapsibleItem[] = [
  { type: 'text' },      // 0
  { type: 'video' },     // 1
  { type: 'label' },     // 2 — never collapsed by collapseAll
  { type: 'quiz' },      // 3
  { type: 'assignment' },// 4
];

describe('useCollapseState — initial state', () => {
  it('starts with nothing collapsed when localStorage is empty', () => {
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    expect(result.current.collapsedItems.size).toBe(0);
    expect(result.current.collapsedCount).toBe(0);
    expect(result.current.allCollapsed).toBe(false);
  });

  it('hydrates from localStorage on mount', () => {
    window.localStorage.setItem('lesson-collapsed-lesson-1', JSON.stringify([0, 3]));
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    expect(result.current.collapsedItems).toEqual(new Set([0, 3]));
  });

  it('tolerates corrupt localStorage data', () => {
    window.localStorage.setItem('lesson-collapsed-lesson-1', 'not-json');
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    expect(result.current.collapsedItems.size).toBe(0);
  });

  it('ignores non-number entries in the persisted array', () => {
    window.localStorage.setItem(
      'lesson-collapsed-lesson-1',
      JSON.stringify([0, 'bogus', null, 3])
    );
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    expect(result.current.collapsedItems).toEqual(new Set([0, 3]));
  });
});

describe('useCollapseState — toggleCollapse', () => {
  it('adds an index when it was not collapsed', () => {
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    act(() => result.current.toggleCollapse(1));
    expect(result.current.collapsedItems).toEqual(new Set([1]));
  });

  it('removes an index when it was already collapsed', () => {
    window.localStorage.setItem('lesson-collapsed-lesson-1', JSON.stringify([1]));
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    act(() => result.current.toggleCollapse(1));
    expect(result.current.collapsedItems.size).toBe(0);
  });

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    act(() => result.current.toggleCollapse(0));
    const saved = JSON.parse(window.localStorage.getItem('lesson-collapsed-lesson-1')!);
    expect(saved).toEqual([0]);
  });
});

describe('useCollapseState — collapseAll / expandAll', () => {
  it('collapseAll collapses every non-label item', () => {
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    act(() => result.current.collapseAll());
    // Indices 0, 1, 3, 4 (label at 2 is excluded)
    expect(result.current.collapsedItems).toEqual(new Set([0, 1, 3, 4]));
  });

  it('expandAll clears every collapsed item', () => {
    window.localStorage.setItem('lesson-collapsed-lesson-1', JSON.stringify([0, 1, 3, 4]));
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    act(() => result.current.expandAll());
    expect(result.current.collapsedItems.size).toBe(0);
  });
});

describe('useCollapseState — derived counts', () => {
  it('collapsibleCount excludes labels', () => {
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    // 5 items total, 1 label → 4 collapsible
    expect(result.current.collapsibleCount).toBe(4);
  });

  it('collapsedCount ignores any stored label indices', () => {
    // Stored set includes index 2 (label) — should not count
    window.localStorage.setItem('lesson-collapsed-lesson-1', JSON.stringify([0, 2, 3]));
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    expect(result.current.collapsedCount).toBe(2); // 0 and 3 are collapsible, not 2
  });

  it('allCollapsed is true iff every collapsible item is collapsed', () => {
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    expect(result.current.allCollapsed).toBe(false);

    act(() => result.current.collapseAll());
    expect(result.current.allCollapsed).toBe(true);

    act(() => result.current.toggleCollapse(0));
    expect(result.current.allCollapsed).toBe(false);
  });

  it('allCollapsed is false for an empty content list (no divide-by-zero edge)', () => {
    const { result } = renderHook(() => useCollapseState('lesson-1', []));
    expect(result.current.collapsibleCount).toBe(0);
    expect(result.current.allCollapsed).toBe(false);
  });
});

describe('useCollapseState — isCollapsed', () => {
  it('returns true for collapsed indices, false otherwise', () => {
    window.localStorage.setItem('lesson-collapsed-lesson-1', JSON.stringify([1, 3]));
    const { result } = renderHook(() => useCollapseState('lesson-1', CONTENT));
    expect(result.current.isCollapsed(1)).toBe(true);
    expect(result.current.isCollapsed(3)).toBe(true);
    expect(result.current.isCollapsed(0)).toBe(false);
    expect(result.current.isCollapsed(42)).toBe(false);
  });
});

describe('useCollapseState — per-lesson isolation', () => {
  it('uses a different storage key per lessonId', () => {
    window.localStorage.setItem('lesson-collapsed-lesson-a', JSON.stringify([0]));
    window.localStorage.setItem('lesson-collapsed-lesson-b', JSON.stringify([1, 2]));

    const a = renderHook(() => useCollapseState('lesson-a', CONTENT));
    const b = renderHook(() => useCollapseState('lesson-b', CONTENT));

    expect(a.result.current.collapsedItems).toEqual(new Set([0]));
    expect(b.result.current.collapsedItems).toEqual(new Set([1, 2]));
  });
});
