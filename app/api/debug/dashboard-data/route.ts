import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = authResult.userProfile;

    const supabase = await createServerSupabaseClient();
    
    // Get student's enrolled courses
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses(*)
      `)
      .eq('student_id', user.id)
      .eq('status', 'active');

    if (enrollmentsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch enrollments', 
        details: enrollmentsError 
      }, { status: 500 });
    }

    const courseIds = enrollments?.map(e => e.course_id).filter(Boolean) || [];

    // Debug assignments
    const { data: allAssignments, error: allAssignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .in('course_id', courseIds);

    const { data: assignmentsWithCourseId, error: assignmentsWithCourseIdError } = await supabase
      .from('assignments')
      .select('*')
      .in('course_id', courseIds)
      .eq('published', true);

    // Check assignments linked through lessons
    const { data: assignmentsViaLessons, error: assignmentsViaLessonsError } = await supabase
      .from('assignments')
      .select(`
        *,
        lessons!inner(course_id)
      `)
      .eq('lessons.course_id', courseIds[0] || '')
      .eq('published', true);

    // Debug discussions
    const { data: allDiscussions, error: allDiscussionsError } = await supabase
      .from('discussions')
      .select('*')
      .in('course_id', courseIds);

    const { data: discussionsWithCourseId, error: discussionsWithCourseIdError } = await supabase
      .from('discussions')
      .select('*')
      .in('course_id', courseIds)
      .eq('published', true);

    // Check lesson discussions
    const { data: lessonDiscussions, error: lessonDiscussionsError } = await supabase
      .from('lesson_discussions')
      .select(`
        *,
        lessons!inner(course_id)
      `)
      .eq('lessons.course_id', courseIds[0] || '')
      .eq('published', true);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      enrollments: {
        count: enrollments?.length || 0,
        courseIds: courseIds,
        data: enrollments
      },
      assignments: {
        allAssignments: {
          count: allAssignments?.length || 0,
          error: allAssignmentsError,
          data: allAssignments
        },
        assignmentsWithCourseId: {
          count: assignmentsWithCourseId?.length || 0,
          error: assignmentsWithCourseIdError,
          data: assignmentsWithCourseId
        },
        assignmentsViaLessons: {
          count: assignmentsViaLessons?.length || 0,
          error: assignmentsViaLessonsError,
          data: assignmentsViaLessons
        }
      },
      discussions: {
        allDiscussions: {
          count: allDiscussions?.length || 0,
          error: allDiscussionsError,
          data: allDiscussions
        },
        discussionsWithCourseId: {
          count: discussionsWithCourseId?.length || 0,
          error: discussionsWithCourseIdError,
          data: discussionsWithCourseId
        },
        lessonDiscussions: {
          count: lessonDiscussions?.length || 0,
          error: lessonDiscussionsError,
          data: lessonDiscussions
        }
      }
    });

  } catch (error) {
    console.error('Dashboard debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
