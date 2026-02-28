import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/learning-paths
 * Get all learning paths with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const published = searchParams.get('published');
    const difficulty = searchParams.get('difficulty');
    const includeProgress = searchParams.get('include_progress') === 'true';

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('learning_paths')
      .select(`
        *,
        courses:learning_path_courses(
          id,
          order,
          is_required,
          unlock_after_previous,
          course:courses(id, title, thumbnail)
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by published status
    if (published === 'true') {
      query = query.eq('published', true);
    } else if (published === 'false') {
      query = query.eq('published', false);
    }

    // Filter by difficulty
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: paths, error } = await query;

    if (error) {
      console.error('Error fetching learning paths:', error);
      return NextResponse.json({ error: 'Failed to fetch learning paths' }, { status: 500 });
    }

    // Enrich paths with creator info (name is on users table)
    const enrichedPaths = await Promise.all(
      (paths || []).map(async (path) => {
        let creator = null;
        if (path.created_by) {
          const { data: creatorData } = await tq
            .from('users')
            .select('id, name')
            .eq('id', path.created_by)
            .single();
          creator = creatorData;
        }
        return { ...path, creator };
      })
    );

    // Include enrollment and progress if requested and user is logged in
    if (includeProgress && user) {
      const { data: enrollments } = await tq
        .from('learning_path_enrollments')
        .select('learning_path_id, enrolled_at, completed_at, status, progress_percentage')
        .eq('student_id', user.id);

      const enrollmentMap = new Map(
        enrollments?.map(e => [e.learning_path_id, e]) || []
      );

      // Calculate progress for each path
      const pathsWithProgress = enrichedPaths.map((path) => {
        const enrollment = enrollmentMap.get(path.id);

        if (enrollment) {
          // Count total and completed courses from path data
          const totalCourses = path.courses?.filter((c: { is_required: boolean }) => c.is_required).length || 0;

          return {
            ...path,
            enrollment: {
              ...enrollment,
              progress: {
                total_courses: totalCourses,
                completed_courses: Math.round((enrollment.progress_percentage || 0) * totalCourses / 100),
                percentage: enrollment.progress_percentage || 0
              }
            }
          };
        }

        return { ...path, enrollment: null };
      });

      return NextResponse.json({ paths: pathsWithProgress });
    }

    return NextResponse.json({ paths: enrichedPaths || [] });
  } catch (error) {
    console.error('Error in learning paths GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/learning-paths
 * Create a new learning path
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or instructor (role is on users table)
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: userData } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'instructor'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, thumbnail, difficulty, estimated_duration, published } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data: path, error } = await tq
      .from('learning_paths')
      .insert({
        title,
        description,
        thumbnail,
        difficulty,
        estimated_duration,
        published: published || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating learning path:', error);
      return NextResponse.json({ error: 'Failed to create learning path' }, { status: 500 });
    }

    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    console.error('Error in learning paths POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
