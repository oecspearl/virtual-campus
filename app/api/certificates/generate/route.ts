import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';
import { generateCertificatePDF, getCertificateTemplate, uploadCertificatePDF } from '@/lib/certificates/generator';
import { generate_verification_code } from '@/lib/certificates/helpers';

/**
 * POST /api/certificates/generate
 * Generate a certificate for a student upon course completion
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, courseId, templateId, forceRegenerate } = body;

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: 'studentId and courseId are required' },
        { status: 400 }
      );
    }

    // Check permissions: student can generate their own, admins/instructors can generate for anyone
    const isOwnCertificate = user.id === studentId;
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(user.role);
    
    // Check if user is instructor for this course
    const serviceSupabase = createServiceSupabaseClient();
    const { data: instructorCheck } = await serviceSupabase
      .from('course_instructors')
      .select('id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .single();
    
    const isInstructor = !!instructorCheck;

    if (!isOwnCertificate && !isAdmin && !isInstructor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if certificate already exists
    if (!forceRegenerate) {
      const { data: existingCert } = await serviceSupabase
        .from('certificates')
        .select('id, pdf_url')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .single();

      if (existingCert) {
        return NextResponse.json({
          message: 'Certificate already exists',
          certificate: existingCert,
          alreadyExists: true
        });
      }
    }

    // Verify course completion
    const { data: enrollment } = await serviceSupabase
      .from('enrollments')
      .select('status, completed_at, progress_percentage')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    if (enrollment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Course not completed yet' },
        { status: 400 }
      );
    }

    // Get course and student details
    const [courseResult, studentResult] = await Promise.all([
      serviceSupabase
        .from('courses')
        .select('title, ceu_credits, credit_type')
        .eq('id', courseId)
        .single(),
      serviceSupabase
        .from('users')
        .select('name, email')
        .eq('id', studentId)
        .single()
    ]);

    if (courseResult.error || !courseResult.data) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (studentResult.error || !studentResult.data) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Calculate final grade if gradebook exists
    const { data: grades } = await serviceSupabase
      .from('course_grades')
      .select('percentage')
      .eq('student_id', studentId)
      .eq('course_id', courseId);

    const gradePercentage = grades && grades.length > 0
      ? grades.reduce((sum, g) => sum + Number(g.percentage), 0) / grades.length
      : null;

    // Get template
    const template = await getCertificateTemplate(templateId);

    // Generate verification code
    const verificationCode = await generate_verification_code();

    // Generate certificate PDF
    const certificateData = {
      studentName: studentResult.data.name,
      courseName: courseResult.data.title,
      completionDate: new Date(enrollment.completed_at || new Date()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      gradePercentage: gradePercentage ? Math.round(gradePercentage) : undefined,
      verificationCode,
      logoUrl: template.logo_url || undefined
    };

    const pdfBuffer = await generateCertificatePDF(certificateData, template.template_html);

    // Upload PDF to storage
    let pdfUrl: string;
    try {
      pdfUrl = await uploadCertificatePDF(pdfBuffer, studentId, courseId, 'temp');
    } catch (storageError: any) {
      console.error('Storage upload error:', storageError);
      // Continue without storage - store PDF in database later or handle differently
      pdfUrl = '';
    }

    // Create certificate record
    const { data: certificate, error: certError } = await serviceSupabase
      .from('certificates')
      .insert([{
        student_id: studentId,
        course_id: courseId,
        template_id: template.id,
        verification_code: verificationCode,
        issued_at: new Date().toISOString(),
        pdf_url: pdfUrl,
        grade_percentage: gradePercentage ? Math.round(gradePercentage) : null,
        metadata: {
          course_title: courseResult.data.title,
          student_name: studentResult.data.name,
          completion_date: enrollment.completed_at
        }
      }])
      .select()
      .single();

    if (certError) {
      console.error('Error creating certificate record:', certError);
      return NextResponse.json(
        { error: 'Failed to create certificate record' },
        { status: 500 }
      );
    }

    // Update PDF URL with actual certificate ID now that we have it
    if (pdfUrl && certificate.id) {
      try {
        const finalPdfUrl = await uploadCertificatePDF(pdfBuffer, studentId, courseId, certificate.id);
        await serviceSupabase
          .from('certificates')
          .update({ pdf_url: finalPdfUrl })
          .eq('id', certificate.id);
        certificate.pdf_url = finalPdfUrl;
      } catch (err) {
        console.error('Error updating certificate PDF URL:', err);
      }
    }

    // Record CEU credits if course has credits
    if (courseResult.data.ceu_credits && courseResult.data.ceu_credits > 0) {
      await serviceSupabase
        .from('ceu_credits')
        .upsert([{
          student_id: studentId,
          course_id: courseId,
          credits: courseResult.data.ceu_credits,
          credit_type: courseResult.data.credit_type || 'CEU',
          certificate_id: certificate.id,
          issued_at: new Date().toISOString()
        }], {
          onConflict: 'student_id,course_id,credit_type'
        });
    }

    return NextResponse.json({
      message: 'Certificate generated successfully',
      certificate
    });

  } catch (error: any) {
    console.error('Certificate generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}

