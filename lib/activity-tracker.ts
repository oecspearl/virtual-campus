/**
 * Activity Tracker Utility
 * Helper functions to track student activities
 */

interface LogActivityParams {
  courseId?: string;
  activityType: string;
  itemId?: string;
  itemType?: string;
  action: string;
  metadata?: Record<string, any>;
}

/**
 * Log a student activity
 * @param params Activity parameters
 * @returns Promise<boolean> Success status
 */
export async function logActivity(params: LogActivityParams): Promise<boolean> {
  try {
    // Only log activities for authenticated users
    const response = await fetch('/api/activity/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('Failed to log activity:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
}

/**
 * Log course access
 */
export async function logCourseAccess(courseId: string): Promise<boolean> {
  return logActivity({
    courseId,
    activityType: 'course_access',
    action: 'viewed',
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log lesson view
 */
export async function logLessonView(courseId: string, lessonId: string, lessonTitle?: string): Promise<boolean> {
  return logActivity({
    courseId,
    activityType: 'lesson_viewed',
    itemId: lessonId,
    itemType: 'lesson',
    action: 'viewed',
    metadata: {
      lessonTitle,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log quiz access
 */
export async function logQuizAccess(courseId: string | null, quizId: string, quizTitle?: string): Promise<boolean> {
  return logActivity({
    courseId: courseId || undefined,
    activityType: 'quiz_accessed',
    itemId: quizId,
    itemType: 'quiz',
    action: 'viewed',
    metadata: {
      quizTitle,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log assignment access
 */
export async function logAssignmentAccess(courseId: string, assignmentId: string, assignmentTitle?: string): Promise<boolean> {
  return logActivity({
    courseId,
    activityType: 'assignment_accessed',
    itemId: assignmentId,
    itemType: 'assignment',
    action: 'viewed',
    metadata: {
      assignmentTitle,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log quiz start
 */
export async function logQuizStart(courseId: string | null, quizId: string, quizTitle?: string): Promise<boolean> {
  return logActivity({
    courseId: courseId || undefined,
    activityType: 'quiz_started',
    itemId: quizId,
    itemType: 'quiz',
    action: 'started',
    metadata: {
      quizTitle,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log quiz submission
 */
export async function logQuizSubmit(
  courseId: string | null,
  quizId: string,
  score?: number,
  maxScore?: number,
  quizTitle?: string
): Promise<boolean> {
  return logActivity({
    courseId: courseId || undefined,
    activityType: 'quiz_submitted',
    itemId: quizId,
    itemType: 'quiz',
    action: 'submitted',
    metadata: {
      quizTitle,
      score,
      maxScore,
      percentage: maxScore ? Math.round((score || 0) / maxScore * 100) : undefined,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log course access
 */
export async function logCourseView(courseId: string, courseTitle?: string): Promise<boolean> {
  return logActivity({
    courseId,
    activityType: 'course_viewed',
    itemId: courseId,
    itemType: 'course',
    action: 'viewed',
    metadata: {
      courseTitle,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log video play
 */
export async function logVideoPlay(
  courseId: string,
  lessonId: string,
  currentTime?: number,
  videoTitle?: string
): Promise<boolean> {
  return logActivity({
    courseId,
    activityType: 'video_played',
    itemId: lessonId,
    itemType: 'video',
    action: 'played',
    metadata: {
      videoTitle,
      currentTime,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log discussion activity
 */
export async function logDiscussionPost(
  courseId: string | undefined,
  discussionId: string,
  postType: 'topic' | 'reply'
): Promise<boolean> {
  return logActivity({
    courseId,
    activityType: 'discussion_posted',
    itemId: discussionId,
    itemType: 'discussion',
    action: postType === 'topic' ? 'created_topic' : 'replied',
    metadata: {
      postType,
      timestamp: new Date().toISOString(),
    },
  });
}

