import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { id: courseId } = await params;

    // Get course instructors with user details
    const { data: instructors, error } = await tq
      .from('course_instructors')
      .select(`
        id,
        instructor_id,
        created_at,
        instructor:users!course_instructors_instructor_id_fkey(
          id,
          email,
          name,
          role
        )
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching course instructors:', error);
      return NextResponse.json({ error: 'Failed to fetch instructors' }, { status: 500 });
    }

    return NextResponse.json({ instructors: instructors || [] });
  } catch (error) {
    console.error('Error in course instructors GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Authenticate via tenant query raw client for auth
    const { data: { user }, error: authError } = await tq.raw.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { instructor_id } = body;

    if (!instructor_id) {
      return NextResponse.json({ error: 'instructor_id is required' }, { status: 400 });
    }

    // Get user data to check role
    const { data: userData, error: userError } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins can add instructors
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userData.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can add course instructors' }, { status: 403 });
    }

    // Verify the instructor exists and has appropriate role
    const { data: instructor, error: instructorError } = await tq
      .from('users')
      .select('id, email, name, role')
      .eq('id', instructor_id)
      .in('role', ['instructor', 'curriculum_designer', 'admin', 'super_admin'])
      .single();

    if (instructorError || !instructor) {
      return NextResponse.json({ error: 'Instructor not found or invalid role' }, { status: 404 });
    }

    // Check if already assigned
    const { data: existingAssignment } = await tq
      .from('course_instructors')
      .select('id')
      .eq('course_id', courseId)
      .eq('instructor_id', instructor_id)
      .single();

    if (existingAssignment) {
      return NextResponse.json({ error: 'Instructor already assigned to this course' }, { status: 409 });
    }

    // Add instructor to course
    const { data: assignment, error: assignmentError } = await tq
      .from('course_instructors')
      .insert([{
        course_id: courseId,
        instructor_id: instructor_id
      }])
      .select(`
        id,
        instructor_id,
        created_at,
        instructor:users!course_instructors_instructor_id_fkey(
          id,
          email,
          name,
          role
        )
      `)
      .single();

    if (assignmentError) {
      console.error('Error adding course instructor:', assignmentError);
      return NextResponse.json({ error: 'Failed to add instructor' }, { status: 500 });
    }

    return NextResponse.json({ instructor: assignment }, { status: 201 });
  } catch (error) {
    console.error('Error in course instructors POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: { user }, error: authError } = await tq.raw.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId } = await params;
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('instructor_id');

    if (!instructorId) {
      return NextResponse.json({ error: 'instructor_id query parameter is required' }, { status: 400 });
    }

    // Get user data to check role
    const { data: userData, error: userError } = await tq
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins can remove instructors
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(userData.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can remove course instructors' }, { status: 403 });
    }

    // Remove instructor from course
    const { error: deleteError } = await tq
      .from('course_instructors')
      .delete()
      .eq('course_id', courseId)
      .eq('instructor_id', instructorId);

    if (deleteError) {
      console.error('Error removing course instructor:', deleteError);
      return NextResponse.json({ error: 'Failed to remove instructor' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in course instructors DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
