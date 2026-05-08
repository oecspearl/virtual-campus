import { describe, it, expect } from 'vitest';
import {
  getActivity,
  tryGetActivity,
  listActivities,
  hasCapability,
} from '../index';

describe('activity registry', () => {
  it('registers the 5 built-in types plus the text alias', () => {
    const ids = listActivities()
      .map((a) => a.id)
      .sort();
    expect(ids).toEqual([
      'assignment',
      'quiz',
      'rich_text',
      'scorm',
      'text',
      'video',
    ]);
  });

  it('getActivity throws on unknown ids', () => {
    expect(() => getActivity('does-not-exist')).toThrow(/Unknown activity type/);
  });

  it('tryGetActivity returns null for unknown / nullish ids', () => {
    expect(tryGetActivity('does-not-exist')).toBeNull();
    expect(tryGetActivity(null)).toBeNull();
    expect(tryGetActivity(undefined)).toBeNull();
  });

  it('captures the gradable / attempts capabilities correctly', () => {
    expect(hasCapability('quiz', 'gradable')).toBe(true);
    expect(hasCapability('assignment', 'gradable')).toBe(true);
    expect(hasCapability('scorm', 'gradable')).toBe(true);
    expect(hasCapability('rich_text', 'gradable')).toBe(false);
    expect(hasCapability('video', 'gradable')).toBe(false);

    expect(hasCapability('quiz', 'attempts')).toBe(true);
    expect(hasCapability('scorm', 'attempts')).toBe(true);
    expect(hasCapability('assignment', 'attempts')).toBe(false);
  });

  it('treats `text` as a rich_text alias for capability checks', () => {
    expect(hasCapability('text', 'completion')).toBe(true);
    expect(hasCapability('text', 'gradable')).toBe(false);
  });

  it('hasCapability returns false for unknown ids rather than throwing', () => {
    expect(hasCapability('does-not-exist', 'gradable')).toBe(false);
    expect(hasCapability(null, 'gradable')).toBe(false);
  });
});
