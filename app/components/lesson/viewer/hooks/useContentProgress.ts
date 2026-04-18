'use client';

import React from 'react';

export interface ContentProgressItem {
  type: string;
  title?: string;
  id?: string;
}

export interface UseContentProgressResult {
  /** Authenticated user's id, or null if not yet loaded / unauthenticated. */
  profileId: string | null;
  /** Map from content index → completed boolean. Missing keys mean "not complete". */
  contentProgress: Record<number, boolean>;
  /** Convenience boolean lookup. */
  isContentComplete: (index: number) => boolean;
  /**
   * Optimistically toggle an item's completion state and persist to the
   * API. Rolls back on error. No-op until `profileId` is set.
   */
  toggleContentComplete: (index: number, item: ContentProgressItem) => Promise<void>;
}

/**
 * Loads the current user's profile + existing content-progress for this
 * lesson, and exposes an optimistic toggle action. The underlying
 * endpoints are:
 *   GET  /api/auth/profile
 *   GET  /api/progress/:profileId/:lessonId/content
 *   PUT  /api/progress/:profileId/:lessonId/content
 */
export function useContentProgress(lessonId: string): UseContentProgressResult {
  const [profileId, setProfileId] = React.useState<string | null>(null);
  const [contentProgress, setContentProgress] = React.useState<Record<number, boolean>>({});

  // Initial load: profile + existing progress rows
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profileRes = await fetch('/api/auth/profile', { cache: 'no-store' });
        const profile = profileRes.ok ? await profileRes.json() : null;
        if (cancelled) return;
        setProfileId(profile?.id ?? null);

        if (profile?.id) {
          const progressRes = await fetch(
            `/api/progress/${profile.id}/${lessonId}/content`,
            { cache: 'no-store' }
          );
          if (!progressRes.ok) return;
          const rows = await progressRes.json();
          if (cancelled || !Array.isArray(rows)) return;
          const map: Record<number, boolean> = {};
          for (const row of rows as Array<{ content_index: number; completed: boolean }>) {
            map[row.content_index] = row.completed;
          }
          setContentProgress(map);
        }
      } catch (error) {
        if (!cancelled) console.error('useContentProgress: load failed', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const isContentComplete = React.useCallback(
    (index: number) => contentProgress[index] === true,
    [contentProgress]
  );

  const toggleContentComplete = React.useCallback(
    async (index: number, item: ContentProgressItem) => {
      if (!profileId) return;

      const nextCompleted = !contentProgress[index];
      setContentProgress((prev) => ({ ...prev, [index]: nextCompleted }));

      try {
        await fetch(`/api/progress/${profileId}/${lessonId}/content`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_index: index,
            content_type: item.type,
            content_title: item.title,
            content_id: item.id,
            completed: nextCompleted,
          }),
        });
      } catch (error) {
        console.error('useContentProgress: toggle failed', error);
        // Roll back the optimistic update on error
        setContentProgress((prev) => ({ ...prev, [index]: !nextCompleted }));
      }
    },
    [profileId, lessonId, contentProgress]
  );

  return { profileId, contentProgress, isContentComplete, toggleContentComplete };
}
