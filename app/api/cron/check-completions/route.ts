import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/cron/check-completions
 * Background job to check for course completions and auto-generate certificates
 * 
 * This should be called by a cron job service (e.g., Vercel Cron, GitHub Actions, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (if set)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceSupabaseClient();
    
    // Find all enrollments marked as completed in the last 24 hours that don't have certificates
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: completedEnrollments, error: enrollmentsError } = await serviceSupabase
      .from('enrollments')
      .select('student_id, course_id, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', yesterday.toISOString())
      .order('completed_at', { ascending: false });

    if (enrollmentsError) {
      console.error('Error fetching completed enrollments:', enrollmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch enrollments' },
        { status: 500 }
      );
    }

    if (!completedEnrollments || completedEnrollments.length === 0) {
      return NextResponse.json({
        message: 'No new completions found',
        certificatesGenerated: 0
      });
    }

    // Check which ones already have certificates
    const enrollmentKeys = completedEnrollments.map(e => ({
      student_id: e.student_id,
      course_id: e.course_id
    }));

    const { data: existingCertificates } = await serviceSupabase
      .from('certificates')
      .select('student_id, course_id');

    const existingKeys = new Set(
      (existingCertificates || []).map(c => `${c.student_id}-${c.course_id}`)
    );

    // Filter out enrollments that already have certificates
    const pendingCertificates = completedEnrollments.filter(
      e => !existingKeys.has(`${e.student_id}-${e.course_id}`)
    );

    if (pendingCertificates.length === 0) {
      return NextResponse.json({
        message: 'All completions already have certificates',
        certificatesGenerated: 0
      });
    }

    // Generate certificates for pending completions
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const enrollment of pendingCertificates) {
      try {
        // Call the certificate generation API
        const generateUrl = new URL('/api/certificates/generate', request.url);
        const response = await fetch(generateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Use service role or create a system token
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            studentId: enrollment.student_id,
            courseId: enrollment.course_id
          })
        });

        if (response.ok) {
          successCount++;
          results.push({
            studentId: enrollment.student_id,
            courseId: enrollment.course_id,
            status: 'success'
          });
        } else {
          errorCount++;
          const errorData = await response.json();
          results.push({
            studentId: enrollment.student_id,
            courseId: enrollment.course_id,
            status: 'error',
            error: errorData.error
          });
        }

        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        errorCount++;
        console.error(`Error generating certificate for ${enrollment.student_id}/${enrollment.course_id}:`, error);
        results.push({
          studentId: enrollment.student_id,
          courseId: enrollment.course_id,
          status: 'error',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      message: 'Certificate generation completed',
      totalCompletions: completedEnrollments.length,
      pendingCertificates: pendingCertificates.length,
      certificatesGenerated: successCount,
      errors: errorCount,
      results
    });

  } catch (error: any) {
    console.error('Check completions cron error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check completions' },
      { status: 500 }
    );
  }
}

