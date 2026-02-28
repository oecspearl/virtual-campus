import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

/**
 * GET /api/programmes
 * Get all programmes (with optional filters)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true';
    const categoryId = searchParams.get('category');
    const withCounts = searchParams.get('withCounts') === 'true';

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is staff (can see unpublished)
    let isStaff = false;
    const authResult = await authenticateUser(request);
    if (authResult.success) {
      isStaff = ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(authResult.userProfile.role);
    }

    let query = tq
      .from('programmes')
      .select(`
        *,
        created_by_user:created_by(name, email),
        programme_courses(
          id,
          course_id,
          order,
          weight,
          is_required,
          course:course_id(id, title, thumbnail)
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by published status
    if (!isStaff || !includeUnpublished) {
      query = query.eq('published', true);
    }

    const { data: programmes, error } = await query;

    if (error) {
      console.error('Error fetching programmes:', error);
      return NextResponse.json({ error: 'Failed to fetch programmes' }, { status: 500 });
    }

    let filteredProgrammes = programmes || [];

    // Add enrollment counts if requested
    if (withCounts) {
      const programmeIds = filteredProgrammes.map(p => p.id);
      const { data: enrollmentCounts } = await tq
        .from('programme_enrollments')
        .select('programme_id')
        .in('programme_id', programmeIds);

      const countMap: Record<string, number> = {};
      enrollmentCounts?.forEach(e => {
        countMap[e.programme_id] = (countMap[e.programme_id] || 0) + 1;
      });

      filteredProgrammes = filteredProgrammes.map(p => ({
        ...p,
        enrollment_count: countMap[p.id] || 0,
        course_count: p.programme_courses?.length || 0
      }));
    }

    // Transform for easier consumption
    const transformedProgrammes = filteredProgrammes.map(p => ({
      ...p,
      courses: p.programme_courses?.map((pc: any) => ({
        ...pc.course,
        order: pc.order,
        weight: pc.weight,
        is_required: pc.is_required
      })) || []
    }));

    return NextResponse.json({ programmes: transformedProgrammes });
  } catch (error) {
    console.error('Programmes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/programmes
 * Create a new programme (admin/curriculum designer only)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, thumbnail, difficulty, estimated_duration, passing_score, published } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check for duplicate slug
    const { data: existing } = await tq
      .from('programmes')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'A programme with this title already exists' }, { status: 409 });
    }

    const { data: programme, error } = await tq
      .from('programmes')
      .insert([{
        title: title.trim(),
        slug,
        description: description?.trim() || null,
        thumbnail: thumbnail || null,
        difficulty: difficulty || null,
        estimated_duration: estimated_duration || null,
        passing_score: passing_score || 70.00,
        published: published || false,
        created_by: userProfile.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating programme:', error);
      return NextResponse.json({ error: 'Failed to create programme' }, { status: 500 });
    }

    return NextResponse.json({ programme }, { status: 201 });
  } catch (error) {
    console.error('Programmes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
