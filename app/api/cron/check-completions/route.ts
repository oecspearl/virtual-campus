import { NextRequest } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { withCronLock } from '@/lib/cron-lock';

/**
 * POST /api/cron/check-completions
 * Background job to check for course completions and auto-generate certificates.
 * Protected by CRON_SECRET and distributed lock.
 */
export async function POST(request: NextRequest) {
  return withCronLock('check-completions', request, async () => {
    const serviceSupabase = createServiceSupabaseClient();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: completedEnrollments, error: enrollmentsError } = await serviceSupabase
      .from('enrollments')
      .select('student_id, course_id, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', yesterday.toISOString())
      .order('completed_at', { ascending: false });

    if (enrollmentsError) {
      throw new Error(`Failed to fetch enrollments: ${enrollmentsError.message}`);
    }

    if (!completedEnrollments || completedEnrollments.length === 0) {
      return { message: 'No new completions found', certificatesGenerated: 0 };
    }

    const { data: existingCertificates } = await serviceSupabase
      .from('certificates')
      .select('student_id, course_id');

    const existingKeys = new Set(
      (existingCertificates || []).map(c => `${c.student_id}-${c.course_id}`)
    );

    const pendingCertificates = completedEnrollments.filter(
      e => !existingKeys.has(`${e.student_id}-${e.course_id}`)
    );

    if (pendingCertificates.length === 0) {
      return { message: 'All completions already have certificates', certificatesGenerated: 0 };
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const enrollment of pendingCertificates) {
      try {
        const generateUrl = new URL('/api/certificates/generate', request.url);
        const response = await fetch(generateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            studentId: enrollment.student_id,
            courseId: enrollment.course_id
          })
        });

        if (response.ok) {
          successCount++;
          results.push({ studentId: enrollment.student_id, courseId: enrollment.course_id, status: 'success' });
        } else {
          errorCount++;
          const errorData = await response.json();
          results.push({ studentId: enrollment.student_id, courseId: enrollment.course_id, status: 'error', error: errorData.error });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        errorCount++;
        results.push({ studentId: enrollment.student_id, courseId: enrollment.course_id, status: 'error', error: error.message });
      }
    }

    return {
      totalCompletions: completedEnrollments.length,
      pendingCertificates: pendingCertificates.length,
      certificatesGenerated: successCount,
      errors: errorCount,
      results,
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
