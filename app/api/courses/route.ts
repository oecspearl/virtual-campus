import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createLogger } from "@/lib/logger";

export async function GET(request: Request) {
  const log = createLogger('api/courses', request as any);
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");
  const subject_area = searchParams.get("subject_area");
  const instructorId = searchParams.get("instructorId");
  const categoryId = searchParams.get("category");
  const schoolId = searchParams.get("school_id");

  try {
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Auth and the school/category filter fetches are independent — run them
    // in parallel so the slowest one (rather than the sum) gates the response.
    const authPromise = authenticateUser(request as any);

    const schoolPromise: Promise<string[] | null> = schoolId
      ? tq
          .from('school_course_assignments')
          .select('course_id')
          .eq('school_id', schoolId)
          .then(({ data }) => (data ?? []).map((a: any) => a.course_id))
      : Promise.resolve(null);

    const categoryPromise: Promise<string[] | null> = categoryId
      ? tq
          .from('course_category_assignments')
          .select('course_id')
          .eq('category_id', categoryId)
          .then(({ data }) => (data ?? []).map((a: any) => a.course_id))
      : Promise.resolve(null);

    const [authResult, schoolFilteredCourseIds, categoryFilteredCourseIds] =
      await Promise.all([authPromise, schoolPromise, categoryPromise]);

    let userRole = 'guest';
    let userId = null;

    if (authResult.success) {
      userRole = authResult.userProfile.role;
      userId = authResult.user.id;
    }

    // Early return if filters produced empty results
    if ((schoolId && schoolFilteredCourseIds?.length === 0) ||
        (categoryId && categoryFilteredCourseIds?.length === 0)) {
      return NextResponse.json({ courses: [], userRole, accessType: 'published_only' });
    }

    let query = tq.from('courses').select('*');

    // Apply role-based filtering using OR conditions instead of multiple queries
    if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'curriculum_designer') {
      // Admins and curriculum designers see all courses — no filter needed
    } else if (userRole === 'instructor') {
      const { data: instructorCourses } = await tq
        .from('course_instructors')
        .select('course_id')
        .eq('instructor_id', userId);

      const teachingIds = instructorCourses?.map(c => c.course_id) || [];

      if (teachingIds.length > 0) {
        // Single query: published OR teaching — use or() filter
        query = tq.from('courses').select('*')
          .or(`published.eq.true,id.in.(${teachingIds.join(',')})`);
      } else {
        query = tq.from('courses').select('*').eq('published', true);
      }
    } else if (userRole === 'student') {
      const { data: enrolledCourses } = await tq
        .from('enrollments')
        .select('class_id, classes!inner(course_id)')
        .eq('student_id', userId)
        .eq('status', 'active');

      const enrolledIds = enrolledCourses?.map((e: any) => e.classes?.course_id).filter(Boolean) || [];

      if (enrolledIds.length > 0) {
        // Single query: published OR enrolled (is_public is implicitly
        // covered since public courses must also be published to appear).
        query = tq.from('courses').select('*')
          .or(`published.eq.true,id.in.(${enrolledIds.join(',')})`);
      } else {
        query = tq.from('courses').select('*').eq('published', true);
      }
    } else {
      // Guest / parent — show only published courses; the per-course content
      // gates (requireCourseAccess) decide what can be opened beyond the
      // catalog card, with is_public allowing read into a course's content.
      query = query.eq('published', true);
    }

    // Apply filters
    if (categoryFilteredCourseIds) query = query.in('id', categoryFilteredCourseIds);
    if (schoolFilteredCourseIds) query = query.in('id', schoolFilteredCourseIds);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (subject_area) query = query.eq('subject_area', subject_area);

    if (instructorId) {
      query = tq
        .from('courses')
        .select('*, course_instructors!inner(instructor_id)')
        .eq('course_instructors.instructor_id', instructorId);
      if (categoryFilteredCourseIds) query = query.in('id', categoryFilteredCourseIds);
    }

    const { data: courses, error } = await query.limit(100);

    if (error) {
      const tenantOverride = (request as unknown as { headers: Headers }).headers.get('x-tenant-override');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      log.error('Courses fetch failed', {
        userRole,
        tenantOverride: tenantOverride || null,
        difficulty,
        subject_area,
        instructorId,
        categoryId,
        schoolId,
        code: err?.code,
        hint: err?.hint,
      }, error);
      return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }

    // Clean up join data from response
    const uniqueCourses = courses?.reduce((acc: any[], course: any) => {
      if (!acc.some(c => c.id === course.id)) {
        const { course_instructors, enrollments, classes, ...cleanCourse } = course;
        acc.push(cleanCourse);
      }
      return acc;
    }, []) || [];

    const accessType = userRole === 'admin' || userRole === 'super_admin' || userRole === 'curriculum_designer'
      ? 'all'
      : userRole === 'instructor'
      ? 'teaching_and_published'
      : userRole === 'student'
      ? 'enrolled_and_published'
      : 'published_only';

    const response = NextResponse.json({ courses: uniqueCourses, userRole, accessType });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return response;
  } catch (e: unknown) {
    const tenantOverride = (request as unknown as { headers: Headers }).headers.get('x-tenant-override');
    log.error('GET handler crashed', {
      tenantOverride: tenantOverride || null,
      difficulty,
      subject_area,
      instructorId,
      categoryId,
      schoolId,
    }, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const log = createLogger('api/courses', request as any);
  try {
    // Use the new authentication system
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;

    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: `Insufficient permissions. Required roles: instructor, curriculum_designer, admin, super_admin. Your role: ${userProfile.role}` }, { status: 403 });
    }

    const body = await request.json();

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const courseData = {
      title: String(body.title || ""),
      description: String(body.description || ""),
      thumbnail: body.thumbnail ? String(body.thumbnail) : null,
      grade_level: String(body.grade_level || ""),
      subject_area: String(body.subject_area || ""),
      difficulty: body.difficulty || "beginner",
      modality: body.modality || "self_paced",
      estimated_duration: body.estimated_duration ? String(body.estimated_duration) : null,
      syllabus: String(body.syllabus || ""),
      published: Boolean(body.published ?? false),
      featured: Boolean(body.featured ?? false),
    };

    const { data: course, error } = await tq
      .from('courses')
      .insert([courseData])
      .select()
      .single();

    if (error) {
      log.error('Course insert failed', { userId: user.id }, error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    // Add course instructors if provided
    if (Array.isArray(body.instructor_ids) && body.instructor_ids.length > 0) {
      const instructorInserts = body.instructor_ids.map((instructorId: string) => ({
        course_id: course.id,
        instructor_id: instructorId
      }));

      await tq.from('course_instructors').insert(instructorInserts);
    }

    return NextResponse.json(course);
  } catch (e: any) {
    log.error('POST handler crashed', undefined, e);
    return NextResponse.json({ error: `Internal server error: ${e.message}` }, { status: 500 });
  }
}
