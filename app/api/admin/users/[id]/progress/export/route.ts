import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';

// Helper to escape CSV values
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET: Export student progress as CSV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'lessons'; // 'lessons' or 'content'

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin', 'instructor', 'curriculum_designer'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get student info
    const { data: student, error: studentError } = await tq
      .from('users')
      .select('id, name, email')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get enrollments
    const { data: enrollments } = await tq
      .from('enrollments')
      .select(`
        course_id,
        enrolled_at,
        courses:course_id (id, title)
      `)
      .eq('student_id', studentId);

    if (!enrollments || enrollments.length === 0) {
      return new Response('No enrollment data', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="progress_${student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    const courseIds = enrollments.map(e => e.course_id);

    // Get lessons
    const { data: lessons } = await tq
      .from('lessons')
      .select('id, title, order, course_id')
      .in('course_id', courseIds)
      .eq('published', true)
      .order('order', { ascending: true });

    const lessonIds = lessons?.map(l => l.id) || [];

    // Get lesson progress
    const { data: lessonProgress } = await tq
      .from('lesson_progress')
      .select('lesson_id, status, completed_at, started_at')
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);

    const lessonProgressMap: Record<string, { status: string; completed_at: string | null; started_at: string | null }> = {};
    lessonProgress?.forEach(p => {
      lessonProgressMap[p.lesson_id] = {
        status: p.status,
        completed_at: p.completed_at,
        started_at: p.started_at
      };
    });

    let csvContent = '';

    if (format === 'content') {
      // Content-level export
      const { data: contentProgress } = await tq
        .from('content_item_progress')
        .select('*')
        .eq('student_id', studentId)
        .in('lesson_id', lessonIds)
        .order('content_index', { ascending: true });

      // CSV Header
      csvContent = 'Student Name,Student Email,Course,Lesson,Lesson Order,Content Index,Content Type,Content Title,Completed,Completed At\n';

      // Build content rows
      const contentRows: string[] = [];

      lessons?.forEach(lesson => {
        const enrollment = enrollments.find(e => e.course_id === lesson.course_id);
        const coursesRaw = enrollment?.courses;
        const course = (Array.isArray(coursesRaw) ? coursesRaw[0] : coursesRaw) as unknown as { id: string; title: string } | null;
        const lessonContentProgress = contentProgress?.filter(cp => cp.lesson_id === lesson.id) || [];

        if (lessonContentProgress.length > 0) {
          lessonContentProgress.forEach(cp => {
            contentRows.push([
              escapeCSV(student.name),
              escapeCSV(student.email),
              escapeCSV(course?.title),
              escapeCSV(lesson.title),
              String(lesson.order),
              String(cp.content_index),
              escapeCSV(cp.content_type),
              escapeCSV(cp.content_title),
              cp.completed ? 'Yes' : 'No',
              cp.completed_at || ''
            ].join(','));
          });
        } else {
          // Include lesson even if no content progress
          contentRows.push([
            escapeCSV(student.name),
            escapeCSV(student.email),
            escapeCSV(course?.title),
            escapeCSV(lesson.title),
            String(lesson.order),
            '',
            '',
            '',
            'No',
            ''
          ].join(','));
        }
      });

      csvContent += contentRows.join('\n');

    } else {
      // Lesson-level export (default)
      // CSV Header
      csvContent = 'Student Name,Student Email,Course,Enrolled At,Lesson,Lesson Order,Status,Started At,Completed At\n';

      // Build rows
      const rows: string[] = [];

      enrollments.forEach(enrollment => {
        const coursesRaw = enrollment.courses;
        const course = (Array.isArray(coursesRaw) ? coursesRaw[0] : coursesRaw) as unknown as { id: string; title: string } | null;
        const courseLessons = lessons?.filter(l => l.course_id === enrollment.course_id) || [];

        courseLessons.forEach(lesson => {
          const progress = lessonProgressMap[lesson.id];
          rows.push([
            escapeCSV(student.name),
            escapeCSV(student.email),
            escapeCSV(course?.title),
            enrollment.enrolled_at,
            escapeCSV(lesson.title),
            String(lesson.order),
            progress?.status || 'not_started',
            progress?.started_at || '',
            progress?.completed_at || ''
          ].join(','));
        });
      });

      csvContent += rows.join('\n');
    }

    // Return CSV file
    const filename = `progress_${student.name.replace(/\s+/g, '_')}_${format}_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Admin progress export error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
