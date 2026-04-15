/**
 * Clean up student data when they are removed from a course.
 * Deletes todos, calendar events, notes, and bookmarks related to the course.
 * @param supabase - Supabase client (service client for admin operations)
 * @param studentId - The student's user ID
 * @param courseId - The course ID being unenrolled from
 * @returns Object with counts of deleted items
 */
export async function cleanupStudentCourseData(
  supabase: any,
  studentId: string,
  courseId: string
): Promise<{
  todosDeleted: number;
  calendarEventsDeleted: number;
  notesDeleted: number;
  bookmarksDeleted: number;
}> {
  let todosDeleted = 0;
  let calendarEventsDeleted = 0;
  let notesDeleted = 0;
  let bookmarksDeleted = 0;

  try {
    // 1. Delete todos linked to this course
    const { data: deletedTodos, error: todosError } = await supabase
      .from('student_todos')
      .delete()
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .select('id');

    if (!todosError && deletedTodos) {
      todosDeleted = deletedTodos.length;
    }

    // 2. Get assignments and quizzes from this course to clean up calendar events
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('course_id', courseId);

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    const lessonIds = lessons?.map((l: any) => l.id) || [];

    // Get quizzes from course lessons
    let quizIds: string[] = [];
    if (lessonIds.length > 0) {
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id')
        .in('lesson_id', lessonIds);
      quizIds = quizzes?.map((q: any) => q.id) || [];
    }

    const assignmentIds = assignments?.map((a: any) => a.id) || [];

    // Delete calendar events for assignments
    if (assignmentIds.length > 0) {
      const { data: deletedAssignmentEvents } = await supabase
        .from('student_calendar_events')
        .delete()
        .eq('student_id', studentId)
        .eq('source_type', 'assignment')
        .in('source_id', assignmentIds)
        .select('id');

      if (deletedAssignmentEvents) {
        calendarEventsDeleted += deletedAssignmentEvents.length;
      }
    }

    // Delete calendar events for quizzes
    if (quizIds.length > 0) {
      const { data: deletedQuizEvents } = await supabase
        .from('student_calendar_events')
        .delete()
        .eq('student_id', studentId)
        .eq('source_type', 'quiz')
        .in('source_id', quizIds)
        .select('id');

      if (deletedQuizEvents) {
        calendarEventsDeleted += deletedQuizEvents.length;
      }
    }

    // 3. Delete notes for this course
    const { data: deletedNotes, error: notesError } = await supabase
      .from('student_notes')
      .delete()
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .select('id');

    if (!notesError && deletedNotes) {
      notesDeleted = deletedNotes.length;
    }

    // Also delete notes linked to lessons in this course
    if (lessonIds.length > 0) {
      const { data: deletedLessonNotes } = await supabase
        .from('student_notes')
        .delete()
        .eq('student_id', studentId)
        .in('lesson_id', lessonIds)
        .select('id');

      if (deletedLessonNotes) {
        notesDeleted += deletedLessonNotes.length;
      }
    }

    // 4. Delete bookmarks for course and its lessons
    const { data: deletedCourseBookmark } = await supabase
      .from('student_bookmarks')
      .delete()
      .eq('student_id', studentId)
      .eq('bookmark_type', 'course')
      .eq('bookmark_id', courseId)
      .select('id');

    if (deletedCourseBookmark) {
      bookmarksDeleted += deletedCourseBookmark.length;
    }

    if (lessonIds.length > 0) {
      const { data: deletedLessonBookmarks } = await supabase
        .from('student_bookmarks')
        .delete()
        .eq('student_id', studentId)
        .eq('bookmark_type', 'lesson')
        .in('bookmark_id', lessonIds)
        .select('id');

      if (deletedLessonBookmarks) {
        bookmarksDeleted += deletedLessonBookmarks.length;
      }
    }

    console.log(`Cleaned up student ${studentId} data for course ${courseId}:`, {
      todosDeleted,
      calendarEventsDeleted,
      notesDeleted,
      bookmarksDeleted
    });

  } catch (error) {
    console.error('Error cleaning up student course data:', error);
  }

  return { todosDeleted, calendarEventsDeleted, notesDeleted, bookmarksDeleted };
}
