import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";

/**
 * Featured Courses API
 *
 * GET /api/courses/featured
 * Returns published courses that are marked as featured
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6');

    // Check if there are manually selected featured courses
    const { data: featuredSetting } = await tq
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'homepage_featured_course_ids')
      .single();

    let featuredCourseIds: string[] = [];
    if (featuredSetting?.setting_value) {
      try {
        featuredCourseIds = JSON.parse(featuredSetting.setting_value);
      } catch (e) {
        console.error('Error parsing featured course IDs:', e);
      }
    }

    let featuredCourses;
    let error;

    // If manually selected courses exist, use those; otherwise use automatic featured courses
    if (featuredCourseIds.length > 0) {
      ({ data: featuredCourses, error } = await tq
        .from('courses')
        .select(`
          id,
          title,
          description,
          thumbnail,
          grade_level,
          subject_area,
          difficulty,
          featured,
          published,
          created_at
        `)
        .in('id', featuredCourseIds)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit));

      // Maintain the order from the settings array
      if (featuredCourses && featuredCourses.length > 0) {
        const courseMap = new Map(featuredCourses.map(c => [c.id, c]));
        featuredCourses = featuredCourseIds
          .map(id => courseMap.get(id))
          .filter(Boolean) as typeof featuredCourses;
      }
    } else {
      // Fallback to automatic featured courses
      ({ data: featuredCourses, error } = await tq
        .from('courses')
        .select(`
          id,
          title,
          description,
          thumbnail,
          grade_level,
          subject_area,
          difficulty,
          featured,
          published,
          created_at
        `)
        .eq('featured', true)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit));
    }

    if (error) {
      console.error('Error fetching featured courses:', error);
      return NextResponse.json({ error: "Failed to fetch featured courses" }, { status: 500 });
    }

    // Get enrollment counts for each course
    const courseIds = featuredCourses?.map(c => c.id) || [];
    let enrollmentCounts: Record<string, number> = {};

    if (courseIds.length > 0) {
      const { data: enrollments } = await tq
        .from('enrollments')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('status', 'active');

      if (enrollments) {
        enrollmentCounts = enrollments.reduce((acc: Record<string, number>, e: any) => {
          acc[e.course_id] = (acc[e.course_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // Enrich courses with enrollment data
    const enrichedCourses = featuredCourses?.map(course => ({
      ...course,
      student_count: enrollmentCounts[course.id] || 0,
      // Format duration (estimate based on lessons or use default)
      duration: 'Varies', // Could be calculated from lessons
      // Default rating if not available
      rating: 4.5, // Could be calculated from reviews if available
    })) || [];

    return NextResponse.json({
      success: true,
      courses: enrichedCourses,
      count: enrichedCourses.length
    });

  } catch (error: any) {
    console.error('Featured courses API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
