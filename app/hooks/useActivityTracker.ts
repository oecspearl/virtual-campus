"use client";

import { useCallback, useRef } from 'react';

export type ActivityType =
  | 'lesson_view'
  | 'lesson_complete'
  | 'quiz_start'
  | 'quiz_submit'
  | 'quiz_complete'
  | 'assignment_view'
  | 'assignment_submit'
  | 'video_play'
  | 'video_complete'
  | 'resource_download'
  | 'discussion_view'
  | 'discussion_post'
  | 'course_enroll'
  | 'course_view'
  | 'search'
  | 'login'
  | 'page_view';

export interface ActivityLogParams {
  courseId?: string;
  activityType: ActivityType;
  itemId?: string;
  itemType?: string;
  action: string;
  metadata?: Record<string, any>;
}

interface UseActivityTrackerOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export function useActivityTracker(options: UseActivityTrackerOptions = {}) {
  const { debounceMs = 1000, enabled = true } = options;
  const lastActivityRef = useRef<{ key: string; timestamp: number } | null>(null);
  const pendingRef = useRef<NodeJS.Timeout | null>(null);

  const logActivity = useCallback(async (params: ActivityLogParams): Promise<boolean> => {
    if (!enabled) return false;

    // Create a unique key for this activity to debounce duplicates
    const activityKey = `${params.activityType}-${params.courseId || ''}-${params.itemId || ''}-${params.action}`;
    const now = Date.now();

    // Debounce: skip if same activity was logged recently
    if (lastActivityRef.current) {
      if (
        lastActivityRef.current.key === activityKey &&
        now - lastActivityRef.current.timestamp < debounceMs
      ) {
        return false;
      }
    }

    // Update last activity
    lastActivityRef.current = { key: activityKey, timestamp: now };

    try {
      const response = await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: params.courseId,
          activityType: params.activityType,
          itemId: params.itemId,
          itemType: params.itemType,
          action: params.action,
          metadata: {
            ...params.metadata,
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.href : undefined,
          },
        }),
      });

      if (!response.ok) {
        console.warn('[ActivityTracker] Failed to log activity:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.warn('[ActivityTracker] Error logging activity:', error);
      return false;
    }
  }, [enabled, debounceMs]);

  // Debounced version that waits before sending
  const logActivityDebounced = useCallback((params: ActivityLogParams) => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current);
    }

    pendingRef.current = setTimeout(() => {
      logActivity(params);
      pendingRef.current = null;
    }, debounceMs);
  }, [logActivity, debounceMs]);

  // Track lesson view
  const trackLessonView = useCallback((courseId: string, lessonId: string, lessonTitle?: string) => {
    return logActivity({
      courseId,
      activityType: 'lesson_view',
      itemId: lessonId,
      itemType: 'lesson',
      action: 'view',
      metadata: { lessonTitle },
    });
  }, [logActivity]);

  // Track lesson completion
  const trackLessonComplete = useCallback((courseId: string, lessonId: string, lessonTitle?: string) => {
    return logActivity({
      courseId,
      activityType: 'lesson_complete',
      itemId: lessonId,
      itemType: 'lesson',
      action: 'complete',
      metadata: { lessonTitle },
    });
  }, [logActivity]);

  // Track quiz start
  const trackQuizStart = useCallback((courseId: string | undefined, quizId: string, quizTitle?: string) => {
    return logActivity({
      courseId,
      activityType: 'quiz_start',
      itemId: quizId,
      itemType: 'quiz',
      action: 'start',
      metadata: { quizTitle },
    });
  }, [logActivity]);

  // Track quiz submission
  const trackQuizSubmit = useCallback((
    courseId: string | undefined,
    quizId: string,
    score?: number,
    maxScore?: number
  ) => {
    return logActivity({
      courseId,
      activityType: 'quiz_submit',
      itemId: quizId,
      itemType: 'quiz',
      action: 'submit',
      metadata: { score, maxScore, percentage: maxScore ? Math.round((score || 0) / maxScore * 100) : undefined },
    });
  }, [logActivity]);

  // Track video play
  const trackVideoPlay = useCallback((courseId: string, lessonId: string, videoUrl?: string, currentTime?: number) => {
    return logActivityDebounced({
      courseId,
      activityType: 'video_play',
      itemId: lessonId,
      itemType: 'video',
      action: 'play',
      metadata: { videoUrl, currentTime },
    });
  }, [logActivityDebounced]);

  // Track course view
  const trackCourseView = useCallback((courseId: string, courseTitle?: string) => {
    return logActivity({
      courseId,
      activityType: 'course_view',
      itemId: courseId,
      itemType: 'course',
      action: 'view',
      metadata: { courseTitle },
    });
  }, [logActivity]);

  // Track page view
  const trackPageView = useCallback((pageName: string, pageUrl?: string) => {
    return logActivity({
      activityType: 'page_view',
      action: 'view',
      metadata: { pageName, pageUrl: pageUrl || (typeof window !== 'undefined' ? window.location.href : undefined) },
    });
  }, [logActivity]);

  // Track discussion activity
  const trackDiscussionPost = useCallback((courseId: string | undefined, discussionId: string, postType: 'topic' | 'reply') => {
    return logActivity({
      courseId,
      activityType: 'discussion_post',
      itemId: discussionId,
      itemType: 'discussion',
      action: postType === 'topic' ? 'create_topic' : 'reply',
      metadata: { postType },
    });
  }, [logActivity]);

  // Track resource download
  const trackResourceDownload = useCallback((courseId: string, resourceId: string, resourceName?: string) => {
    return logActivity({
      courseId,
      activityType: 'resource_download',
      itemId: resourceId,
      itemType: 'resource',
      action: 'download',
      metadata: { resourceName },
    });
  }, [logActivity]);

  return {
    logActivity,
    logActivityDebounced,
    trackLessonView,
    trackLessonComplete,
    trackQuizStart,
    trackQuizSubmit,
    trackVideoPlay,
    trackCourseView,
    trackPageView,
    trackDiscussionPost,
    trackResourceDownload,
  };
}

export default useActivityTracker;
