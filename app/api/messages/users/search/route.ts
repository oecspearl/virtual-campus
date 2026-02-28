import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/messages/users/search - Search for users to message
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");
    const courseId = searchParams.get("course_id"); // Optional: filter by course

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const serviceSupabase = createServiceSupabaseClient();

    // Get blocked users
    const { data: blockedUsers } = await serviceSupabase
      .from("student_chat_blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);

    const blockedIds = (blockedUsers || []).map((b) => b.blocked_id);
    blockedIds.push(user.id); // Exclude self

    // Build search query
    let usersQuery = serviceSupabase
      .from("users")
      .select("id, name, email, role")
      .not("id", "in", `(${blockedIds.join(",")})`)
      .order("name", { ascending: true })
      .limit(limit);

    // Add search filter if query provided
    if (query.trim().length >= 2) {
      usersQuery = usersQuery.or(
        `name.ilike.%${query}%,email.ilike.%${query}%`
      );
    }

    // If filtering by course, get enrolled students and instructors
    if (courseId) {
      // Get students enrolled in the course
      const { data: enrollments } = await serviceSupabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)
        .eq("status", "active");

      const enrolledIds = (enrollments || []).map((e) => e.student_id);

      // Get course instructor
      const { data: course } = await serviceSupabase
        .from("courses")
        .select("instructor_id")
        .eq("id", courseId)
        .single();

      if (course?.instructor_id) {
        enrolledIds.push(course.instructor_id);
      }

      // Get additional instructors
      const { data: courseInstructors } = await serviceSupabase
        .from("course_instructors")
        .select("instructor_id")
        .eq("course_id", courseId);

      (courseInstructors || []).forEach((ci) => {
        if (!enrolledIds.includes(ci.instructor_id)) {
          enrolledIds.push(ci.instructor_id);
        }
      });

      // Filter to only course participants
      if (enrolledIds.length > 0) {
        usersQuery = usersQuery.in("id", enrolledIds);
      } else {
        return NextResponse.json({ users: [] });
      }
    }

    const { data: users, error } = await usersQuery;

    if (error) {
      console.error("Error searching users:", error);
      return NextResponse.json(
        { error: "Failed to search users" },
        { status: 500 }
      );
    }

    // Add role display names
    const usersWithRoles = (users || []).map((u) => ({
      ...u,
      role_display: getRoleDisplayName(u.role),
    }));

    return NextResponse.json({ users: usersWithRoles });
  } catch (error) {
    console.error("Search users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    student: "Student",
    instructor: "Instructor",
    admin: "Administrator",
    super_admin: "Super Admin",
    curriculum_designer: "Curriculum Designer",
    parent: "Parent",
  };
  return roleMap[role] || role;
}
