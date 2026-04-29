import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser } from "@/lib/api-auth";
import { getEnrolledCourseIds, getPublicCourseIds } from "@/lib/enrollment-check";
import { getTenantIdFromRequest } from "@/lib/tenant-query";
import { hasRole } from "@/lib/rbac";

const STAFF_ROLES = ['instructor', 'curriculum_designer', 'admin', 'tenant_admin', 'super_admin'] as const;

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const { user, userProfile } = authResult;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all"; // all, courses, lessons, assignments, discussions
    const limit = parseInt(searchParams.get("limit") || "20");

    // Students/parents can only see search results from courses they're
    // enrolled in plus courses marked is_public. Staff see everything in
    // their tenant.
    const isStaff = hasRole(userProfile!.role, STAFF_ROLES);
    const tenantId = getTenantIdFromRequest(request);

    let visibleCourseIds: string[] | null = null; // null = no filter (staff)
    if (!isStaff) {
      const [enrolled, publicIds] = await Promise.all([
        getEnrolledCourseIds(user.id),
        getPublicCourseIds(tenantId),
      ]);
      visibleCourseIds = Array.from(new Set([...enrolled, ...publicIds]));
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        results: {
          courses: [],
          lessons: [],
          assignments: [],
          discussions: [],
        },
        total: 0,
      });
    }

    const supabase = await createServerSupabaseClient();
    const searchQuery = `%${query.trim()}%`;

    const results: {
      courses: any[];
      lessons: any[];
      assignments: any[];
      discussions: any[];
    } = {
      courses: [],
      lessons: [],
      assignments: [],
      discussions: [],
    };

    // Short-circuit: a non-staff user with no enrolled and no public courses
    // can't see any course-scoped results, so return empty without hitting the DB.
    if (visibleCourseIds !== null && visibleCourseIds.length === 0) {
      return NextResponse.json({ results, total: 0, query });
    }

    // Search courses
    if (type === "all" || type === "courses") {
      let coursesQuery = supabase
        .from("courses")
        .select("id, title, description, thumbnail, published, difficulty, grade_level, subject_area")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq("published", true)
        .limit(limit);

      if (visibleCourseIds !== null) {
        coursesQuery = coursesQuery.in("id", visibleCourseIds);
      }

      const { data: courses, error: coursesError } = await coursesQuery;
      if (!coursesError && courses) {
        results.courses = courses;
      }
    }

    // Search lessons
    if (type === "all" || type === "lessons") {
      let lessonsQuery = supabase
        .from("lessons")
        .select("id, title, description, course_id, order, published")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq("published", true)
        .limit(limit);

      if (visibleCourseIds !== null) {
        lessonsQuery = lessonsQuery.in("course_id", visibleCourseIds);
      }

      const { data: lessons, error: lessonsError } = await lessonsQuery;

      if (!lessonsError && lessons) {
        // Get course info for each lesson
        const courseIds = [...new Set(lessons.map((l) => l.course_id).filter(Boolean))];
        if (courseIds.length > 0) {
          const { data: courses } = await supabase
            .from("courses")
            .select("id, title")
            .in("id", courseIds);

          if (courses) {
            const courseMap = new Map(courses.map((c) => [c.id, c]));
            results.lessons = lessons.map((lesson) => ({
              ...lesson,
              course: courseMap.get(lesson.course_id),
            }));
          } else {
            results.lessons = lessons;
          }
        } else {
          results.lessons = lessons;
        }
      }
    }

    // Search assignments
    if (type === "all" || type === "assignments") {
      let assignmentsQuery = supabase
        .from("assignments")
        .select("id, title, description, due_date, course_id, created_at")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (visibleCourseIds !== null) {
        assignmentsQuery = assignmentsQuery.in("course_id", visibleCourseIds);
      }

      const { data: assignments, error: assignmentsError } = await assignmentsQuery;

      if (!assignmentsError && assignments) {
        // Get course info for each assignment
        const courseIds = [...new Set(assignments.map((a) => a.course_id).filter(Boolean))];
        if (courseIds.length > 0) {
          const { data: courses } = await supabase
            .from("courses")
            .select("id, title")
            .in("id", courseIds);

          if (courses) {
            const courseMap = new Map(courses.map((c) => [c.id, c]));
            results.assignments = assignments.map((assignment) => ({
              ...assignment,
              course: courseMap.get(assignment.course_id),
            }));
          } else {
            results.assignments = assignments;
          }
        } else {
          results.assignments = assignments;
        }
      }
    }

    // Search discussions
    if (type === "all" || type === "discussions") {
      let discussionsQuery = supabase
        .from("discussions")
        .select("id, title, content, course_id, lesson_id, created_at, author_id")
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(limit);

      if (visibleCourseIds !== null) {
        discussionsQuery = discussionsQuery.in("course_id", visibleCourseIds);
      }

      const { data: discussions, error: discussionsError } = await discussionsQuery;

      if (!discussionsError && discussions) {
        // Get course/lesson info and author info
        const courseIds = [...new Set(discussions.map((d) => d.course_id).filter(Boolean))];
        const lessonIds = [...new Set(discussions.map((d) => d.lesson_id).filter(Boolean))];
        const authorIds = [...new Set(discussions.map((d) => d.author_id).filter(Boolean))];

        const promises = [];

        if (courseIds.length > 0) {
          promises.push(
            supabase
              .from("courses")
              .select("id, title")
              .in("id", courseIds)
          );
        }

        if (lessonIds.length > 0) {
          promises.push(
            supabase
              .from("lessons")
              .select("id, title")
              .in("id", lessonIds)
          );
        }

        if (authorIds.length > 0) {
          promises.push(
            supabase
              .from("users")
              .select("id, name, email")
              .in("id", authorIds)
          );
        }

        const [coursesRes, lessonsRes, authorsRes] = await Promise.all(promises);

        const courseMap = coursesRes?.data
          ? new Map(coursesRes.data.map((c) => [c.id, c]))
          : new Map();
        const lessonMap = lessonsRes?.data
          ? new Map(lessonsRes.data.map((l) => [l.id, l]))
          : new Map();
        const authorMap = authorsRes?.data
          ? new Map(authorsRes.data.map((a) => [a.id, a]))
          : new Map();

        results.discussions = discussions.map((discussion) => ({
          ...discussion,
          course: discussion.course_id ? courseMap.get(discussion.course_id) : null,
          lesson: discussion.lesson_id ? lessonMap.get(discussion.lesson_id) : null,
          author: discussion.author_id ? authorMap.get(discussion.author_id) : null,
        }));
      }
    }

    const total =
      results.courses.length +
      results.lessons.length +
      results.assignments.length +
      results.discussions.length;

    return NextResponse.json({
      results,
      total,
      query,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

