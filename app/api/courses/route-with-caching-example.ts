/**
 * Example: Courses API with Caching
 * 
 * This is an example showing how to add caching to the courses API route.
 * Copy this implementation to app/api/courses/route.ts to enable caching.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { withCache, CacheKeys, CacheTTL, CacheInvalidation } from "@/lib/cache-utils";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const subject_area = searchParams.get("subject_area");
    const instructorId = searchParams.get("instructorId");

    try {
        // Try to authenticate user to get role-based filtering
        const authResult = await authenticateUser(request as any);
        let userRole = 'guest';
        let userId = null;

        if (authResult.success) {
            userRole = authResult.userProfile.role;
            userId = authResult.user.id;
        }

        // Generate cache key based on filters and user role
        const filters = { difficulty, subject_area, instructorId, userRole, userId };
        const cacheKey = CacheKeys.courses.list(filters);

        // Use cache with 5-minute TTL
        const result = await withCache(
            cacheKey,
            async () => {
                const supabase = await createServerSupabaseClient();
                let query = supabase.from('courses').select('*');

                // Apply role-based filtering (same as original)
                if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'curriculum_designer') {
                    console.log('Admin/Curriculum Designer access: showing all courses');
                } else if (userRole === 'instructor') {
                    query = supabase
                        .from('courses')
                        .select(`
              *,
              course_instructors!left(instructor_id)
            `)
                        .or(`published.eq.true,and(course_instructors.instructor_id.eq.${userId})`);
                } else if (userRole === 'student') {
                    query = supabase
                        .from('courses')
                        .select(`
              *,
              enrollments!left(student_id, class_id),
              classes!left(id, course_id)
            `)
                        .or(`published.eq.true,and(classes.course_id.eq.id,and(enrollments.student_id.eq.${userId},enrollments.status.eq.active))`);
                } else {
                    query = query.eq('published', true);
                }

                // Apply additional filters
                if (difficulty) {
                    query = query.eq('difficulty', difficulty);
                }
                if (subject_area) {
                    query = query.eq('subject_area', subject_area);
                }
                if (instructorId) {
                    query = supabase
                        .from('courses')
                        .select(`
              *,
              course_instructors!inner(instructor_id)
            `)
                        .eq('course_instructors.instructor_id', instructorId);
                }

                const { data: courses, error } = await query.limit(100);

                if (error) {
                    console.error('Courses fetch error:', error);
                    throw new Error("Failed to fetch courses");
                }

                // Filter out duplicates and clean up the data
                const uniqueCourses = courses?.reduce((acc: any[], course: any) => {
                    const existing = acc.find(c => c.id === course.id);
                    if (!existing) {
                        const { course_instructors, enrollments, classes, ...cleanCourse } = course;
                        acc.push(cleanCourse);
                    }
                    return acc;
                }, []) || [];

                return {
                    courses: uniqueCourses,
                    userRole,
                    accessType: userRole === 'admin' || userRole === 'super_admin' || userRole === 'curriculum_designer'
                        ? 'all'
                        : userRole === 'instructor'
                            ? 'teaching_and_published'
                            : userRole === 'student'
                                ? 'enrolled_and_published'
                                : 'published_only'
                };
            },
            CacheTTL.MEDIUM // 5 minutes
        );

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('Courses API error:', e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await authenticateUser(request as any);
        if (!authResult.success) {
            console.log('Course creation authentication failed:', authResult.error);
            return createAuthResponse(authResult.error!, authResult.status!);
        }

        const { user, userProfile } = authResult;
        console.log('Creating course for user:', { id: user.id, role: userProfile.role });

        if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
            console.log('User role not authorized for course creation:', userProfile.role);
            return NextResponse.json({
                error: `Insufficient permissions. Required roles: instructor, curriculum_designer, admin, super_admin. Your role: ${userProfile.role}`
            }, { status: 403 });
        }

        const body = await request.json();
        console.log('Course creation request body:', body);

        const supabase = await createServerSupabaseClient();

        const courseData = {
            title: String(body.title || ""),
            description: String(body.description || ""),
            thumbnail: body.thumbnail ? String(body.thumbnail) : null,
            grade_level: String(body.grade_level || ""),
            subject_area: String(body.subject_area || ""),
            difficulty: body.difficulty || "beginner",
            syllabus: String(body.syllabus || ""),
            published: Boolean(body.published ?? false),
            featured: Boolean(body.featured ?? false),
        };

        console.log('Course data to insert:', courseData);

        const { data: course, error } = await supabase
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

            await supabase.from('course_instructors').insert(instructorInserts);
        }

        // Invalidate course caches after creating a new course
        CacheInvalidation.courses();

        return NextResponse.json(course);
    } catch (e: any) {
        console.error('Course creation error:', e);
        return NextResponse.json({ error: `Internal server error: ${e.message}` }, { status: 500 });
    }
}
