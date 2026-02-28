import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

/**
 * GET /api/courses/[id]/groups
 * Get all groups for a course
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);
    const isInstructor = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);

    // Check if user is enrolled or is instructor
    if (!isInstructor) {
      const { data: enrollment } = await tq
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", user.id)
        .single();

      if (!enrollment) {
        return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
      }
    }

    // Get groups with members
    const { data: groups, error } = await tq
      .from("course_groups")
      .select(`
        *,
        course_group_members (
          id,
          student_id,
          role,
          joined_at,
          users:users!course_group_members_student_id_fkey (id, name, email)
        )
      `)
      .eq("course_id", courseId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching groups:", error);
      return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
    }

    // For students, also return their group membership
    let myGroup = null;
    if (!isInstructor) {
      const { data: membership } = await tq
        .from("course_group_members")
        .select(`
          *,
          course_groups!inner (id, name, course_id)
        `)
        .eq("student_id", user.id)
        .eq("course_groups.course_id", courseId)
        .single();

      if (membership) {
        myGroup = membership;
      }
    }

    return NextResponse.json({
      groups: groups || [],
      myGroup,
      isInstructor
    });

  } catch (e: any) {
    console.error("Course groups GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/courses/[id]/groups
 * Create a new group or perform group actions
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);
    const isInstructor = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);

    // Handle different actions
    if (body.action === "join") {
      // Student joining a group
      const { group_id } = body;
      if (!group_id) {
        return NextResponse.json({ error: "Group ID required" }, { status: 400 });
      }

      // Check if group allows self-enrollment
      const { data: group } = await tq
        .from("course_groups")
        .select("*, course_group_members(count)")
        .eq("id", group_id)
        .eq("course_id", courseId)
        .single();

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }

      if (!group.allow_self_enrollment && !isInstructor) {
        return NextResponse.json({ error: "Self-enrollment not allowed for this group" }, { status: 403 });
      }

      // Check if group is full
      const memberCount = group.course_group_members?.[0]?.count || 0;
      if (group.max_members && memberCount >= group.max_members) {
        return NextResponse.json({ error: "Group is full" }, { status: 400 });
      }

      // Check if student is already in a group for this course
      const { data: existingMembership } = await tq
        .from("course_group_members")
        .select(`
          *,
          course_groups!inner (course_id)
        `)
        .eq("student_id", user.id)
        .eq("course_groups.course_id", courseId)
        .single();

      if (existingMembership) {
        return NextResponse.json({ error: "Already a member of a group in this course" }, { status: 400 });
      }

      // Add student to group
      const { data: membership, error } = await tq
        .from("course_group_members")
        .insert([{
          group_id,
          student_id: user.id,
          role: "member",
          joined_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error("Error joining group:", error);
        return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
      }

      return NextResponse.json({ success: true, membership });

    } else if (body.action === "leave") {
      // Student leaving a group
      const { group_id } = body;

      const { error } = await tq
        .from("course_group_members")
        .delete()
        .eq("group_id", group_id)
        .eq("student_id", user.id);

      if (error) {
        console.error("Error leaving group:", error);
        return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
      }

      return NextResponse.json({ success: true });

    } else if (body.action === "add_member") {
      // Instructor adding a member to a group
      if (!isInstructor) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { group_id, student_id, role = "member" } = body;

      const { data: membership, error } = await tq
        .from("course_group_members")
        .insert([{
          group_id,
          student_id,
          role,
          joined_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error("Error adding member:", error);
        return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
      }

      return NextResponse.json({ success: true, membership });

    } else if (body.action === "remove_member") {
      // Instructor removing a member
      if (!isInstructor) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { group_id, student_id } = body;

      const { error } = await tq
        .from("course_group_members")
        .delete()
        .eq("group_id", group_id)
        .eq("student_id", student_id);

      if (error) {
        console.error("Error removing member:", error);
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
      }

      return NextResponse.json({ success: true });

    } else if (body.action === "auto_assign") {
      // Auto-assign students to groups
      if (!isInstructor) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { group_size = 4 } = body;

      // Get all enrolled students not in a group
      const { data: enrollments } = await tq
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)
        .eq("status", "active");

      if (!enrollments || enrollments.length === 0) {
        return NextResponse.json({ error: "No enrolled students found" }, { status: 400 });
      }

      // Get students already in groups
      const { data: existingMembers } = await tq
        .from("course_group_members")
        .select(`
          student_id,
          course_groups!inner (course_id)
        `)
        .eq("course_groups.course_id", courseId);

      const existingMemberIds = new Set((existingMembers || []).map(m => m.student_id));
      const unassignedStudents = enrollments
        .filter(e => !existingMemberIds.has(e.student_id))
        .map(e => e.student_id);

      if (unassignedStudents.length === 0) {
        return NextResponse.json({ error: "All students are already assigned to groups" }, { status: 400 });
      }

      // Shuffle students
      const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5);

      // Calculate number of groups needed
      const numGroups = Math.ceil(shuffled.length / group_size);
      const groupsCreated: any[] = [];
      const membersCreated: any[] = [];

      for (let i = 0; i < numGroups; i++) {
        // Create group
        const { data: group, error: groupError } = await tq
          .from("course_groups")
          .insert([{
            course_id: courseId,
            name: `Group ${i + 1}`,
            max_members: group_size,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (groupError) {
          console.error("Error creating group:", groupError);
          continue;
        }

        groupsCreated.push(group);

        // Add members to this group
        const startIdx = i * group_size;
        const endIdx = Math.min(startIdx + group_size, shuffled.length);
        const groupMembers = shuffled.slice(startIdx, endIdx);

        for (let j = 0; j < groupMembers.length; j++) {
          const { data: member } = await tq
            .from("course_group_members")
            .insert([{
              group_id: group.id,
              student_id: groupMembers[j],
              role: j === 0 ? "leader" : "member", // First member is leader
              joined_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (member) {
            membersCreated.push(member);
          }
        }
      }

      return NextResponse.json({
        success: true,
        groups_created: groupsCreated.length,
        members_assigned: membersCreated.length
      });

    } else {
      // Create a new group (instructor only)
      if (!isInstructor) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { name, description, max_members = 5, allow_self_enrollment = false } = body;

      if (!name) {
        return NextResponse.json({ error: "Group name required" }, { status: 400 });
      }

      const { data: group, error } = await tq
        .from("course_groups")
        .insert([{
          course_id: courseId,
          name,
          description: description || null,
          max_members,
          allow_self_enrollment,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating group:", error);
        return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
      }

      return NextResponse.json({ success: true, group });
    }

  } catch (e: any) {
    console.error("Course groups POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/courses/[id]/groups
 * Update a group
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { group_id, name, description, max_members, allow_self_enrollment } = body;

    if (!group_id) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (max_members !== undefined) updateData.max_members = max_members;
    if (allow_self_enrollment !== undefined) updateData.allow_self_enrollment = allow_self_enrollment;

    const { data: group, error } = await tq
      .from("course_groups")
      .update(updateData)
      .eq("id", group_id)
      .eq("course_id", courseId)
      .select()
      .single();

    if (error) {
      console.error("Error updating group:", error);
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
    }

    return NextResponse.json({ success: true, group });

  } catch (e: any) {
    console.error("Course groups PUT error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[id]/groups
 * Delete a group
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group_id");

    if (!groupId) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from("course_groups")
      .delete()
      .eq("id", groupId)
      .eq("course_id", courseId);

    if (error) {
      console.error("Error deleting group:", error);
      return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error("Course groups DELETE error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
