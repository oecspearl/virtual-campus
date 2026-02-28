'use client';

import { useCallback, useRef } from 'react';

interface ActivityLogParams {
  courseId?: string;
  activityType: string;
  itemId?: string;
  itemType?: string;
  action: string;
  metadata?: Record<string, any>;
}

interface UseActivityLoggerOptions {
  /** Debounce time in ms to prevent duplicate logs (default: 2000) */
  debounceMs?: number;
  /** Whether to log errors to console (default: true) */
  logErrors?: boolean;
}

/**
 * Hook for logging student activities asynchronously.
 * Activities are logged in the background without blocking the UI.
 *
 * @example
 * const { logActivity } = useActivityLogger();
 *
 * // Log a lesson view
 * logActivity({
 *   courseId: 'course-uuid',
 *   activityType: 'lesson_viewed',
 *   itemId: 'lesson-uuid',
 *   itemType: 'lesson',
 *   action: 'viewed',
 *   metadata: { lessonTitle: 'Introduction' }
 * });
 */
export function useActivityLogger(options: UseActivityLoggerOptions = {}) {
  const { debounceMs = 2000, logErrors = true } = options;

  // Track recently logged activities to prevent duplicates
  const recentActivities = useRef<Map<string, number>>(new Map());

  const logActivity = useCallback(async (params: ActivityLogParams): Promise<void> => {
    const { courseId, activityType, itemId, itemType, action, metadata } = params;

    // Create a unique key for this activity
    const activityKey = `${activityType}-${itemId || 'none'}-${action}`;
    const now = Date.now();
    const lastLogged = recentActivities.current.get(activityKey);

    // Skip if this same activity was logged recently (within debounce window)
    if (lastLogged && now - lastLogged < debounceMs) {
      return;
    }

    // Update the last logged time
    recentActivities.current.set(activityKey, now);

    // Clean up old entries (older than 10 seconds)
    for (const [key, time] of recentActivities.current.entries()) {
      if (now - time > 10000) {
        recentActivities.current.delete(key);
      }
    }

    // Log activity asynchronously (fire and forget)
    try {
      const response = await fetch('/api/activity/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          activityType,
          itemId,
          itemType,
          action,
          metadata,
        }),
      });

      if (!response.ok && logErrors) {
        console.warn('[ActivityLogger] Failed to log activity:', await response.text());
      }
    } catch (error) {
      if (logErrors) {
        console.warn('[ActivityLogger] Error logging activity:', error);
      }
    }
  }, [debounceMs, logErrors]);

  return { logActivity };
}

// Pre-defined activity types for consistency
export const ACTIVITY_TYPES = {
  // Course activities
  COURSE_ACCESSED: 'course_accessed',
  COURSE_ENROLLED: 'course_enrolled',

  // Lesson activities
  LESSON_VIEWED: 'lesson_viewed',
  LESSON_COMPLETED: 'lesson_completed',
  LESSON_STARTED: 'lesson_started',

  // Quiz activities
  QUIZ_STARTED: 'quiz_started',
  QUIZ_SUBMITTED: 'quiz_submitted',
  QUIZ_REVIEWED: 'quiz_reviewed',

  // Assignment activities
  ASSIGNMENT_VIEWED: 'assignment_viewed',
  ASSIGNMENT_SUBMITTED: 'assignment_submitted',
  ASSIGNMENT_GRADED: 'assignment_graded',

  // Content activities
  VIDEO_WATCHED: 'video_watched',
  FILE_DOWNLOADED: 'file_downloaded',
  RESOURCE_ACCESSED: 'resource_accessed',

  // Progress activities
  PROGRESS_UPDATED: 'progress_updated',
  CONTENT_COMPLETED: 'content_completed',

  // Discussion activities
  DISCUSSION_POSTED: 'discussion_posted',
  DISCUSSION_REPLIED: 'discussion_replied',

  // Page activities
  PAGE_VIEWED: 'page_viewed',
} as const;

export const ITEM_TYPES = {
  COURSE: 'course',
  LESSON: 'lesson',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
  VIDEO: 'video',
  FILE: 'file',
  RESOURCE: 'resource',
  DISCUSSION: 'discussion',
  PAGE: 'page',
} as const;

export const ACTIONS = {
  VIEWED: 'viewed',
  STARTED: 'started',
  COMPLETED: 'completed',
  SUBMITTED: 'submitted',
  DOWNLOADED: 'downloaded',
  ENROLLED: 'enrolled',
  POSTED: 'posted',
  REPLIED: 'replied',
} as const;
