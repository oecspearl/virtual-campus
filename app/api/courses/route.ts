import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");
  const subject_area = searchParams.get("subject_area");
  const instructorId = searchParams.get("instructorId");
  const categoryId = searchParams.get("category");
  const schoolId = searchParams.get("school_id");

  try {
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);
    const authResult = await authenticateUser(request as any);

    let userRole = 'guest';
    let userId = null;

    if (authResult.success) {
      userRole = authResult.userProfile.role;
      userId = authResult.user.id;
    }

    // Run school and category filters in parallel if needed
    let schoolFilteredCourseIds: string[] | null = null;
    let categoryFilteredCourseIds: string[] | null = null;

    const filterPromises: Promise<void>[] = [];

    if (schoolId) {
      filterPromises.push(
        (async () => {
          const { data: schoolAssignments } = await tq
            .from('school_course_assignments')
            .select('course_id')
            .eq('school_id', schoolId);
          schoolFilteredCourseIds = schoolAssignments && schoolAssignments.length > 0
            ? schoolAssignments.map(a => a.course_id)
            : [];
        })()
      );
    }

    if (categoryId) {
      filterPromises.push(
        (async () => {
          const { data: categoryAssignments } = await tq
            .from('course_category_assignments')
            .select('course_id')
            .eq('category_id', categoryId);
          categoryFilteredCourseIds = categoryAssignments && categoryAssignments.length > 0
            ? categoryAssignments.map(a => a.course_id)
            : [];
        })()
      );
    }

    if (filterPromises.length > 0) await Promise.all(filterPromises);

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
        // Single query: published OR enrolled
        query = tq.from('courses').select('*')
          .or(`published.eq.true,id.in.(${enrolledIds.join(',')})`);
      } else {
        query = tq.from('courses').select('*').eq('published', true);
      }
    } else {
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
      // The original `console.error('Courses fetch error:', error)` printed
      // [object Object] in many runtimes — surface the actual fields so 500s
      // are diagnosable in Vercel logs without a repro.
      const tenantHeader = (request as unknown as { headers: Headers }).headers.get('x-tenant-id');
      const tenantOverride = (request as unknown as { headers: Headers }).headers.get('x-tenant-override');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      console.error('Courses fetch error', {
        userRole,
        tenantId: tenantHeader,
        tenantOverride: tenantOverride || null,
        difficulty,
        subject_area,
        instructorId,
        categoryId,
        schoolId,
        name: err?.name,
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
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
    const tenantHeader = (request as unknown as { headers: Headers }).headers.get('x-tenant-id');
    const tenantOverride = (request as unknown as { headers: Headers }).headers.get('x-tenant-override');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    console.error('Courses API error', {
      tenantId: tenantHeader,
      tenantOverride: tenantOverride || null,
      difficulty,
      subject_area,
      instructorId,
      categoryId,
      schoolId,
      name: err?.name,
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Use the new authentication system
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('Course creation authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    console.log('Creating course for user:', { id: user.id, role: userProfile.role });

    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      console.log('User role not authorized for course creation:', userProfile.role);
      return NextResponse.json({ error: `Insufficient permissions. Required roles: instructor, curriculum_designer, admin, super_admin. Your role: ${userProfile.role}` }, { status: 403 });
    }

    const body = await request.json();
    console.log('Course creation request body:', body);

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

    console.log('Course data to insert:', courseData);

    const { data: course, error } = await tq
      .from('courses')
      .insert([courseData])
      .select()
      .single();

    console.log('Course creation result:', { course, error });

    if (error) {
      console.error('Supabase error:', error);
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
    console.error('Course creation error:', e);
    return NextResponse.json({ error: `Internal server error: ${e.message}` }, { status: 500 });
  }
}
