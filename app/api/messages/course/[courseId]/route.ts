import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/messages/course/[courseId] - Get the course chat room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const serviceSupabase = createServiceSupabaseClient();

    // Verify course exists and user has access
    const { data: course, error: courseError } = await serviceSupabase
      .from("courses")
      .select("id, title, instructor_id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if user is enrolled or is the instructor
    const isInstructor = course.instructor_id === user.id;

    const { data: enrollment } = await serviceSupabase
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .eq("status", "active")
      .single();

    // Also check course_instructors table
    const { data: courseInstructor } = await serviceSupabase
      .from("course_instructors")
      .select("id")
      .eq("course_id", courseId)
      .eq("instructor_id", user.id)
      .single();

    if (!isInstructor && !enrollment && !courseInstructor) {
      return NextResponse.json(
        { error: "You are not enrolled in this course" },
        { status: 403 }
      );
    }

    // Look for existing course chat room
    const { data: existingRoom } = await serviceSupabase
      .from("student_chat_rooms")
      .select("*")
      .eq("course_id", courseId)
      .eq("room_type", "course")
      .eq("is_archived", false)
      .single();

    if (existingRoom) {
      // Check if user is already a member
      const { data: membership } = await serviceSupabase
        .from("student_chat_members")
        .select("id")
        .eq("room_id", existingRoom.id)
        .eq("user_id", user.id)
        .single();

      // If not a member, add them
      if (!membership) {
        await serviceSupabase.from("student_chat_members").insert([
          {
            room_id: existingRoom.id,
            user_id: user.id,
            member_role: isInstructor ? "admin" : "member",
          },
        ]);
      }

      // Get member count
      const { data: members } = await serviceSupabase
        .from("student_chat_members")
        .select("id")
        .eq("room_id", existingRoom.id);

      return NextResponse.json({
        room: {
          ...existingRoom,
          display_name: `${course.title} - Class Chat`,
          member_count: members?.length || 0,
          is_new: false,
        },
      });
    }

    // Create new course chat room
    const { data: newRoom, error: roomError } = await serviceSupabase
      .from("student_chat_rooms")
      .insert([
        {
          name: `${course.title} - Class Chat`,
          description: `Official chat room for ${course.title}`,
          room_type: "course",
          course_id: courseId,
          created_by: course.instructor_id,
        },
      ])
      .select("*")
      .single();

    if (roomError) {
      console.error("Error creating course chat room:", roomError);
      return NextResponse.json(
        { error: "Failed to create course chat" },
        { status: 500 }
      );
    }

    // Add the instructor as owner
    await serviceSupabase.from("student_chat_members").insert([
      {
        room_id: newRoom.id,
        user_id: course.instructor_id,
        member_role: "owner",
      },
    ]);

    // Add all enrolled students
    const { data: enrollments } = await serviceSupabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("status", "active");

    if (enrollments && enrollments.length > 0) {
      const studentMembers = enrollments
        .filter((e) => e.student_id !== course.instructor_id)
        .map((e) => ({
          room_id: newRoom.id,
          user_id: e.student_id,
          member_role: "member",
        }));

      if (studentMembers.length > 0) {
        await serviceSupabase.from("student_chat_members").insert(studentMembers);
      }
    }

    // Add additional instructors
    const { data: additionalInstructors } = await serviceSupabase
      .from("course_instructors")
      .select("instructor_id")
      .eq("course_id", courseId);

    if (additionalInstructors && additionalInstructors.length > 0) {
      const instructorMembers = additionalInstructors
        .filter((i) => i.instructor_id !== course.instructor_id)
        .map((i) => ({
          room_id: newRoom.id,
          user_id: i.instructor_id,
          member_role: "admin",
        }));

      if (instructorMembers.length > 0) {
        await serviceSupabase
          .from("student_chat_members")
          .insert(instructorMembers);
      }
    }

    return NextResponse.json(
      {
        room: {
          ...newRoom,
          display_name: `${course.title} - Class Chat`,
          member_count: (enrollments?.length || 0) + 1,
          is_new: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Get/create course chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
