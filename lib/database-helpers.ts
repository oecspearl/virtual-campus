import { createServerSupabaseClient, createServiceSupabaseClient } from './supabase-server'
import { Database } from './supabase'

type Tables = Database['public']['Tables']

// Helper function to get the current user
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Use service client to bypass RLS (same pattern as middleware and API auth)
  const serviceSupabase = createServiceSupabaseClient()
  const { data: profile } = await serviceSupabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile ? { ...user, ...profile } : user
}

// Helper function to check if user has specific role
export function hasRole(userRole: string, requiredRoles: string | string[]): boolean {
  if (!userRole) return false

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  return roles.includes(userRole)
}

// Helper function to check if user is admin
export async function isAdmin() {
  const user = await getCurrentUser()
  if (!user) return false
  return hasRole(user.role, ['admin', 'super_admin', 'tenant_admin'])
}

// Helper function to check if user can grade
export async function canGrade() {
  const user = await getCurrentUser()
  if (!user) return false
  return hasRole(user.role, ['instructor', 'admin', 'super_admin'])
}

// Helper function to check if user can create courses
export async function canCreateCourses() {
  const user = await getCurrentUser()
  if (!user) return false
  return hasRole(user.role, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])
}

// Helper function to get user's classes (as instructor or student)
export async function getUserClasses() {
  const user = await getCurrentUser()
  if (!user) return { instructorClasses: [], studentClasses: [] }
  
  const supabase = await createServerSupabaseClient()
  
  // Get classes where user is instructor
  const { data: instructorClasses } = await supabase
    .from('classes')
    .select(`
      *,
      course_instructors!inner(instructor_id),
      courses(*)
    `)
    .eq('course_instructors.instructor_id', user.id)
  
  // Get classes where user is student
  const { data: studentClasses } = await supabase
    .from('classes')
    .select(`
      *,
      class_students!inner(student_id),
      courses(*)
    `)
    .eq('class_students.student_id', user.id)
  
  return {
    instructorClasses: instructorClasses || [],
    studentClasses: studentClasses || []
  }
}

// Helper function to get course with subjects and lessons
export async function getCourseWithContent(courseId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: course } = await supabase
    .from('courses')
    .select(`
      *,
      subjects(
        *,
        lessons(*)
      )
    `)
    .eq('id', courseId)
    .single()
  
  return course
}

// Helper function to get quiz with questions
export async function getQuizWithQuestions(quizId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      *,
      questions(*)
    `)
    .eq('id', quizId)
    .single()
  
  return quiz
}

// Helper function to get assignment with submissions
export async function getAssignmentWithSubmissions(assignmentId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: assignment } = await supabase
    .from('assignments')
    .select(`
      *,
      assignment_submissions(*)
    `)
    .eq('id', assignmentId)
    .single()
  
  return assignment
}

// Helper function to get class with students and grades
export async function getClassWithStudents(classId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: classData } = await supabase
    .from('classes')
    .select(`
      *,
      class_students(
        student_id,
        users(*)
      ),
      grade_items(*)
    `)
    .eq('id', classId)
    .single()
  
  return classData
}

// Helper function to create a new user profile
export async function createUserProfile(userData: {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'instructor' | 'curriculum_designer' | 'student' | 'parent'
}) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Helper function to update user profile
export async function updateUserProfile(userId: string, updates: Partial<Tables['users']['Update']>) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Helper function to get user's progress in a course
export async function getUserCourseProgress(userId: string, courseId: string) {
  const supabase = await createServerSupabaseClient()

  // Get all lessons in the course
  const { data: lessons } = await supabase
    .from('lessons')
    .select(`
      id,
      subjects!inner(course_id)
    `)
    .eq('subjects.course_id', courseId)

  if (!lessons) return { total: 0, completed: 0, percentage: 0 }

  const total = lessons.length

  // Get completed lessons
  const { data: progress } = await supabase
    .from('progress')
    .select('lesson_id')
    .eq('student_id', userId)
    .eq('status', 'completed')
    .in('lesson_id', lessons.map(l => l.id))

  const completed = progress?.length || 0
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, percentage }
}

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
