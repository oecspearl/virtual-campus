import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";
import StreamlinedGradebook from "@/app/components/gradebook/StreamlinedGradebook";
import StudentGradebook from "@/app/components/gradebook/StudentGradebook";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import { stripHtml } from "@/lib/utils";

export default async function CourseGradebookPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id: courseId } = await params;
  const supabase = await createServerSupabaseClient();
  const service = await createServiceSupabaseClient();
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  // Check user role and access
  const isInstructor = await checkCourseInstructor(service, user.id, courseId);
  const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);
  const isEnrolled = await checkEnrollment(service, user.id, courseId);

  if (!isInstructor && !isAdmin && !isEnrolled) {
    notFound();
  }

  const isStudent = !isInstructor && !isAdmin;

  try {
    // Get course information
    const { data: course, error: courseError } = await service
      .from("courses")
      .select("id, title, description")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      console.error("Error fetching course:", courseError);
      return (
        <div className="mx-auto max-w-3xl px-4 py-10 text-center text-gray-700">
          <h1 className="text-2xl font-semibold mb-2">Course unavailable</h1>
          <p>We couldn't load this course right now.</p>
        </div>
      );
    }

    // Get enrolled students (only for instructors/admins)
    let students = [];
    if (!isStudent) {
      const { data: enrollments, error: enrollmentError } = await service
        .from("enrollments")
        .select(`
          student_id,
          users!enrollments_student_id_fkey(id, name, email)
        `)
        .eq("course_id", courseId)
        .eq("status", "active");

      students = enrollmentError || !enrollments ? [] : enrollments.map(e => {
        const u = (Array.isArray(e.users) ? e.users[0] : e.users) as any;
        return {
          id: u?.id,
          name: u?.name,
          email: u?.email
        };
      });
    }

    // Get grade items (filter by is_active if column exists)
    let { data: gradeItems, error: itemsError } = await service
      .from("course_grade_items")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    // Fallback if is_active column doesn't exist
    if (itemsError) {
      const fallback = await service
        .from("course_grade_items")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });
      
      if (!fallback.error && fallback.data) {
        gradeItems = fallback.data;
        itemsError = null;
      }
    }

    // Filter out grade items for deleted quizzes and assignments
    if (gradeItems && gradeItems.length > 0) {
      // Get quiz IDs that need to be verified
      const quizIds = gradeItems
        .filter(item => item.type === 'quiz' && item.assessment_id)
        .map(item => item.assessment_id)
        .filter((id): id is string => !!id);

      // Get assignment IDs that need to be verified
      const assignmentIds = gradeItems
        .filter(item => item.type === 'assignment' && item.assessment_id)
        .map(item => item.assessment_id)
        .filter((id): id is string => !!id);

      const existingQuizIds = new Set<string>();
      const existingAssignmentIds = new Set<string>();

      // Only query if there are IDs to check
      if (quizIds.length > 0) {
        const { data: existingQuizzes } = await service
          .from("quizzes")
          .select("id")
          .in("id", quizIds);
        
        if (existingQuizzes) {
          existingQuizzes.forEach(q => existingQuizIds.add(q.id));
        }
      }

      if (assignmentIds.length > 0) {
        const { data: existingAssignments } = await service
          .from("assignments")
          .select("id")
          .in("id", assignmentIds);
        
        if (existingAssignments) {
          existingAssignments.forEach(a => existingAssignmentIds.add(a.id));
        }
      }

      // Filter out items for deleted quizzes/assignments
      gradeItems = gradeItems.filter(item => {
        // If it's a quiz type and has an assessment_id, check if quiz exists
        if (item.type === 'quiz' && item.assessment_id) {
          return existingQuizIds.has(item.assessment_id);
        }
        // If it's an assignment type and has an assessment_id, check if assignment exists
        if (item.type === 'assignment' && item.assessment_id) {
          return existingAssignmentIds.has(item.assessment_id);
        }
        // For other types or items without assessment_id, keep them
        return true;
      });
    }

    // Deduplicate grade items that reference the same assessment (e.g., a quiz
    // linked both directly to a course and via a lesson). Keep the last item by created order.
    const items = (() => {
      if (itemsError || !gradeItems) return [] as typeof gradeItems;
      const map = new Map<string, (typeof gradeItems)[number]>();
      for (const gi of gradeItems) {
        const key = `${gi.type}:${gi.assessment_id ?? gi.id}`;
        map.set(key, gi); // later entries (by created_at order) overwrite earlier ones
      }
      return Array.from(map.values());
    })();

    // Get grades (different queries for students vs instructors)
    let gradeData = [];
    if (isStudent) {
      // Students only see their own grades
      // First get grade items for this course, then get grades that reference those items
      const { data: courseGradeItems } = await service
        .from("course_grade_items")
        .select("id")
        .eq("course_id", courseId)
        .eq("is_active", true);
      
      const gradeItemIds = courseGradeItems?.map(item => item.id) || [];
      
      if (gradeItemIds.length > 0) {
        const { data: grades, error: gradesError } = await service
          .from("course_grades")
          .select(`
            *,
            grade_item:course_grade_items(title, type, category, points, course_id)
          `)
          .eq("course_id", courseId)
          .eq("student_id", user.id)
          .in("grade_item_id", gradeItemIds)
          .order("created_at", { ascending: false });

        // Filter to ensure grade items belong to this course
        gradeData = (gradesError || !grades ? [] : grades).filter((grade: any) => 
          grade.grade_item && grade.grade_item.course_id === courseId
        );
      }
    } else {
      // Instructors/admins see all grades
      // First get grade items for this course, then get grades that reference those items
      const { data: courseGradeItems } = await service
        .from("course_grade_items")
        .select("id")
        .eq("course_id", courseId)
        .eq("is_active", true);
      
      const gradeItemIds = courseGradeItems?.map(item => item.id) || [];
      
      if (gradeItemIds.length > 0) {
        const { data: grades, error: gradesError } = await service
          .from("course_grades")
          .select(`
            *,
            grade_item:course_grade_items(title, type, category, points, course_id),
            student:users!course_grades_student_id_fkey(id, name, email)
          `)
          .eq("course_id", courseId)
          .in("grade_item_id", gradeItemIds)
          .order("created_at", { ascending: false });

        // Filter to ensure grade items belong to this course
        gradeData = (gradesError || !grades ? [] : grades).filter((grade: any) => 
          grade.grade_item && grade.grade_item.course_id === courseId
        );
      }
    }

    // Get gradebook settings
    const { data: settings, error: settingsError } = await service
      .from("course_gradebook_settings")
      .select("*")
      .eq("course_id", courseId)
      .single();

    // Get all quizzes and assignments for this course (from lessons)
    const { data: lessons, error: lessonsError } = await service
      .from("lessons")
      .select("id, title")
      .eq("course_id", courseId);

    let courseQuizzes = [];
    let courseAssignments = [];
    
    if (!lessonsError && lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      
      // Get quizzes
      const { data: quizzes, error: quizzesError } = await service
        .from("quizzes")
        .select("*")
        .in("lesson_id", lessonIds)
        .order("created_at", { ascending: true });

      if (!quizzesError && quizzes) {
        // Map quizzes to include lesson information and activation status
        courseQuizzes = quizzes.map(quiz => {
          const lesson = lessons.find(l => l.id === quiz.lesson_id);
          return {
            ...quiz,
            lesson_title: lesson?.title || 'Unknown Lesson',
            is_activated: items.some(item => item.assessment_id === quiz.id && item.type === 'quiz') || false
          };
        });
      }

      // Get assignments
      const { data: assignments, error: assignmentsError } = await service
        .from("assignments")
        .select("*")
        .in("lesson_id", lessonIds)
        .order("created_at", { ascending: true });

      if (!assignmentsError && assignments) {
        // Map assignments to include lesson information and activation status
        courseAssignments = assignments.map(assignment => {
          const lesson = lessons.find(l => l.id === assignment.lesson_id);
          return {
            ...assignment,
            lesson_title: lesson?.title || 'Unknown Lesson',
            is_activated: items.some(item => item.assessment_id === assignment.id && item.type === 'assignment') || false
          };
        });
      }
    }

    // Get gradebook statistics
    let stats = null;
    try {
      const { data: statsData, error: statsError } = await service
        .rpc('get_gradebook_stats', { target_course_id: courseId });
      
      if (!statsError && statsData && statsData.length > 0) {
        stats = statsData[0];
      }
    } catch (error) {
      console.log('Stats function not available, using fallback calculation');
      // Fallback calculation if function doesn't exist
      stats = {
        total_students: students.length,
        active_grade_items: items.filter(item => item.is_active !== false).length,
        inactive_grade_items: items.filter(item => item.is_active === false).length,
        total_grades: gradeData.length,
        courses_with_orphaned_items: 0
      };
    }

    if (isStudent) {
      // Render student gradebook
      return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Courses', href: '/courses' },
              { label: course.title || 'Course', href: `/course/${courseId}` },
              { label: 'Gradebook' },
            ]}
            className="mb-6"
          />
          <StudentGradebook
            courseId={courseId}
            initialData={{
              course,
              items,
              grades: gradeData,
              settings: settings || undefined
            }}
          />
        </div>
      );
    } else {
      // Render instructor/admin gradebook
      return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Courses', href: '/courses' },
              { label: course.title || 'Course', href: `/course/${courseId}` },
              { label: 'Gradebook' },
            ]}
            className="mb-6"
          />
          <div className="mb-8">
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">{course.title}</h1>
            <p className="mt-2 text-gray-600">{stripHtml(course.description || '')}</p>
          </div>
          
          <StreamlinedGradebook
            courseId={courseId}
            initialData={{
              students,
              items,
              grades: gradeData,
              stats: stats,
              settings: settings || undefined
            }}
          />
        </div>
      );
    }

  } catch (error) {
    console.error("Error loading course gradebook:", error);
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-gray-700">
        <h1 className="text-2xl font-semibold mb-2">Gradebook unavailable</h1>
        <p>We couldn't load your gradebook right now.</p>
      </div>
    );
  }
}

// Helper function to check if user is instructor for a course
async function checkCourseInstructor(supabase: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await supabase
    .from("course_instructors")
    .select("id")
    .eq("course_id", courseId)
    .eq("instructor_id", userId)
    .maybeSingle();
  
  return !!data;
}

// Helper function to check if user is enrolled in a course
async function checkEnrollment(supabase: any, userId: string, courseId: string): Promise<boolean> {
  // Be tolerant: consider any enrollment row as enrolled (active/completed/null)
  const { data } = await supabase
    .from("enrollments")
    .select("id,status")
    .eq("student_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  return !!data;
}
