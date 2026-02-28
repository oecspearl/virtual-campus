import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/discussions/[id]/grades - Get all grades for a discussion (instructor) or own grade (student)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;

    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get discussion to check course and verify it's graded
    const { data: discussion, error: discussionError } = await tq
      .from('course_discussions')
      .select('id, course_id, is_graded, points, rubric')
      .eq('id', discussionId)
      .single();

    if (discussionError || !discussion) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    if (!discussion.is_graded) {
      return NextResponse.json({ error: "This discussion is not graded" }, { status: 400 });
    }

    // Check if user is instructor/admin
    const isAdmin = userProfile?.role && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);
    const { data: instructorCheck } = await tq
      .from('course_instructors')
      .select('id')
      .eq('course_id', discussion.course_id)
      .eq('instructor_id', user.id)
      .single();
    const isInstructor = !!instructorCheck;

    if (isInstructor || isAdmin) {
      // Get all grades for this discussion
      const { data: grades, error: gradesError } = await tq
        .from('discussion_grades')
        .select('*')
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: false });

      if (gradesError) {
        console.error('Error fetching discussion grades:', gradesError);
        return NextResponse.json({ error: "Failed to fetch grades", details: gradesError.message }, { status: 500 });
      }

      // Get all users for enriching grades
      const userIds = new Set<string>();
      grades?.forEach(g => {
        if (g.student_id) userIds.add(g.student_id);
        if (g.graded_by) userIds.add(g.graded_by);
      });

      const { data: users } = await tq
        .from('users')
        .select('id, name, email')
        .in('id', Array.from(userIds));

      const usersMap = new Map<string, { id: string; name: string; email: string }>(users?.map((u: { id: string; name: string; email: string }) => [u.id, u]) || []);

      // Enrich grades with user info
      const enrichedGrades = grades?.map(g => ({
        ...g,
        student: usersMap.get(g.student_id) || null,
        grader: usersMap.get(g.graded_by) ? { id: g.graded_by, name: usersMap.get(g.graded_by)!.name } : null
      })) || [];

      // Get participation stats for all enrolled students
      const { data: enrollments } = await tq
        .from('enrollments')
        .select('student_id')
        .eq('course_id', discussion.course_id)
        .eq('status', 'active');

      // Get user info for enrolled students
      const enrolledStudentIds = enrollments?.map(e => e.student_id) || [];
      const { data: enrolledUsers } = await tq
        .from('users')
        .select('id, name, email')
        .in('id', enrolledStudentIds);

      // Get post counts per student
      const { data: posts } = await tq
        .from('discussion_replies')
        .select('author_id, content')
        .eq('discussion_id', discussionId);

      const studentStats: Record<string, { posts: number; words: number }> = {};
      posts?.forEach(post => {
        if (!studentStats[post.author_id]) {
          studentStats[post.author_id] = { posts: 0, words: 0 };
        }
        studentStats[post.author_id].posts++;
        studentStats[post.author_id].words += post.content?.split(/\s+/).length || 0;
      });

      const enrolledUsersMap = new Map(enrolledUsers?.map(u => [u.id, u]) || []);

      const studentsWithStats = enrolledStudentIds.map(studentId => {
        const studentUser = enrolledUsersMap.get(studentId);
        return {
          id: studentId,
          name: studentUser?.name || 'Unknown',
          email: studentUser?.email || '',
          stats: studentStats[studentId] || { posts: 0, words: 0 },
          grade: enrichedGrades?.find(g => g.student_id === studentId) || null
        };
      }).filter(s => s.name !== 'Unknown'); // Filter out any students without user records

      return NextResponse.json({
        discussion,
        students: studentsWithStats,
        grades: enrichedGrades || []
      });
    } else {
      // Student: get only own grade
      const { data: grade, error: gradeError } = await tq
        .from('discussion_grades')
        .select('*')
        .eq('discussion_id', discussionId)
        .eq('student_id', user.id)
        .single();

      // Get own participation stats
      const { data: posts } = await tq
        .from('discussion_replies')
        .select('content')
        .eq('discussion_id', discussionId)
        .eq('author_id', user.id);

      const stats = {
        posts: posts?.length || 0,
        words: posts?.reduce((acc, p) => acc + (p.content?.split(/\s+/).length || 0), 0) || 0
      };

      return NextResponse.json({
        discussion,
        stats,
        grade: gradeError ? null : grade
      });
    }

  } catch (error) {
    console.error('Discussion grades GET error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/discussions/[id]/grades - Grade a student's discussion participation
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;

    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get discussion to verify it's graded
    const { data: discussion, error: discussionError } = await tq
      .from('course_discussions')
      .select('id, course_id, is_graded, points, rubric')
      .eq('id', discussionId)
      .single();

    if (discussionError || !discussion) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    if (!discussion.is_graded) {
      return NextResponse.json({ error: "This discussion is not graded" }, { status: 400 });
    }

    // Check authorization
    const isAdmin = userProfile?.role && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);
    const { data: instructorCheck } = await tq
      .from('course_instructors')
      .select('id')
      .eq('course_id', discussion.course_id)
      .eq('instructor_id', user.id)
      .single();
    const isInstructor = !!instructorCheck;

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Only instructors can grade discussions" }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, score, rubric_scores, feedback } = body;

    if (!student_id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    if (score === undefined || score === null) {
      return NextResponse.json({ error: "Score is required" }, { status: 400 });
    }

    const maxScore = discussion.points || 100;
    const percentage = Math.round((score / maxScore) * 100 * 100) / 100;

    // Get student participation stats
    const { data: posts } = await tq
      .from('discussion_replies')
      .select('content')
      .eq('discussion_id', discussionId)
      .eq('author_id', student_id);

    const totalPosts = posts?.length || 0;
    const totalWords = posts?.reduce((acc, p) => acc + (p.content?.split(/\s+/).length || 0), 0) || 0;

    // Upsert the grade
    const { data: grade, error: gradeError } = await tq
      .from('discussion_grades')
      .upsert({
        discussion_id: discussionId,
        student_id,
        course_id: discussion.course_id,
        total_posts: totalPosts,
        total_replies: totalPosts, // Same for now
        total_words: totalWords,
        rubric_scores,
        score,
        max_score: maxScore,
        percentage,
        feedback,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'discussion_id,student_id'
      })
      .select('*')
      .single();

    if (gradeError) {
      console.error('Error saving discussion grade:', gradeError);
      console.error('Grade error details:', JSON.stringify(gradeError, null, 2));
      return NextResponse.json({
        error: "Failed to save grade",
        details: gradeError.message || gradeError.code || 'Unknown error'
      }, { status: 500 });
    }

    // Fetch student and grader info separately to avoid FK naming issues
    const { data: student } = await tq
      .from('users')
      .select('id, name, email')
      .eq('id', student_id)
      .single();

    const { data: grader } = await tq
      .from('users')
      .select('id, name')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      grade: {
        ...grade,
        student,
        grader
      }
    });

  } catch (error) {
    console.error('Discussion grades POST error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/discussions/[id]/grades - Bulk grade multiple students
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: discussionId } = await params;

    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get discussion
    const { data: discussion, error: discussionError } = await tq
      .from('course_discussions')
      .select('id, course_id, is_graded, points')
      .eq('id', discussionId)
      .single();

    if (discussionError || !discussion) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    if (!discussion.is_graded) {
      return NextResponse.json({ error: "This discussion is not graded" }, { status: 400 });
    }

    // Check authorization
    const isAdmin = userProfile?.role && ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);
    const { data: instructorCheck } = await tq
      .from('course_instructors')
      .select('id')
      .eq('course_id', discussion.course_id)
      .eq('instructor_id', user.id)
      .single();
    const isInstructor = !!instructorCheck;

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Only instructors can grade discussions" }, { status: 403 });
    }

    const body = await request.json();
    const { grades } = body; // Array of { student_id, score, rubric_scores?, feedback? }

    if (!Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json({ error: "Grades array is required" }, { status: 400 });
    }

    const maxScore = discussion.points || 100;
    const results = [];
    const errors = [];

    for (const gradeData of grades) {
      const { student_id, score, rubric_scores, feedback } = gradeData;

      if (!student_id || score === undefined) {
        errors.push({ student_id, error: "Missing student_id or score" });
        continue;
      }

      const percentage = Math.round((score / maxScore) * 100 * 100) / 100;

      const { data: grade, error: gradeError } = await tq
        .from('discussion_grades')
        .upsert({
          discussion_id: discussionId,
          student_id,
          course_id: discussion.course_id,
          rubric_scores,
          score,
          max_score: maxScore,
          percentage,
          feedback,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'discussion_id,student_id'
        })
        .select()
        .single();

      if (gradeError) {
        errors.push({ student_id, error: gradeError.message });
      } else {
        results.push(grade);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      graded: results.length,
      errors: errors.length > 0 ? errors : undefined,
      grades: results
    });

  } catch (error) {
    console.error('Discussion grades PUT error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
