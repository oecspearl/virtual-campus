import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/database-helpers';
import PDFDocument from 'pdfkit';

/**
 * POST /api/transcripts/generate
 * Generate a transcript PDF for a student
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    // Check permissions
    const isOwnRequest = user.id === studentId;
    const isAdmin = ['admin', 'super_admin', 'curriculum_designer'].includes(user.role);

    if (!isOwnRequest && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Get student info
    const { data: student, error: studentError } = await serviceSupabase
      .from('users')
      .select('name, email')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get all completed courses with certificates
    const { data: certificates, error: certError } = await serviceSupabase
      .from('certificates')
      .select(`
        *,
        course:courses!certificates_course_id_fkey(id, title, description, ceu_credits, credit_type)
      `)
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false });

    if (certError) {
      console.error('Error fetching certificates:', certError);
      return NextResponse.json(
        { error: 'Failed to fetch course data' },
        { status: 500 }
      );
    }

    if (!certificates || certificates.length === 0) {
      return NextResponse.json(
        { error: 'No completed courses found' },
        { status: 400 }
      );
    }

    // Calculate total credits
    const totalCredits = certificates.reduce((sum, cert) => {
      const credits = (cert.course as any)?.ceu_credits || 0;
      return sum + Number(credits);
    }, 0);

    // Calculate GPA if grades exist
    const grades = certificates
      .filter(c => c.grade_percentage !== null)
      .map(c => Number(c.grade_percentage));
    
    const gpa = grades.length > 0
      ? grades.reduce((sum, g) => sum + g, 0) / grades.length / 100 * 4.0
      : null;

    // Prepare course data for transcript
    const courseData = certificates.map(cert => ({
      courseTitle: (cert.course as any)?.title || 'Unknown Course',
      completedDate: cert.issued_at,
      grade: cert.grade_percentage ? `${Math.round(cert.grade_percentage)}%` : 'Pass',
      credits: (cert.course as any)?.ceu_credits || 0,
      creditType: (cert.course as any)?.credit_type || 'CEU'
    }));

    // Generate PDF
    const pdfBuffer = await generateTranscriptPDF(student, courseData, totalCredits, gpa);

    // Upload to storage (similar to certificate upload)
    const fileName = `${studentId}/transcript-${Date.now()}.pdf`;
    const bucket = 'certificates';
    
    let pdfUrl = '';
    try {
      const { data: uploadData, error: uploadError } = await serviceSupabase.storage
        .from(bucket)
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = serviceSupabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
        pdfUrl = urlData.publicUrl;
      }
    } catch (storageError) {
      console.error('Storage upload error:', storageError);
    }

    // Save transcript record
    const { data: transcript, error: transcriptError } = await serviceSupabase
      .from('transcripts')
      .insert([{
        student_id: studentId,
        generated_at: new Date().toISOString(),
        pdf_url: pdfUrl,
        course_data: courseData,
        total_credits: totalCredits,
        gpa: gpa
      }])
      .select()
      .single();

    if (transcriptError) {
      console.error('Error creating transcript record:', transcriptError);
      // Still return the PDF buffer even if storage fails
    }

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="transcript-${student.name}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error: any) {
    console.error('Transcript generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate transcript' },
      { status: 500 }
    );
  }
}

/**
 * Generate transcript PDF
 */
async function generateTranscriptPDF(
  student: { name: string; email: string },
  courseData: Array<{
    courseTitle: string;
    completedDate: string;
    grade: string;
    credits: number;
    creditType: string;
  }>,
  totalCredits: number,
  gpa: number | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('OFFICIAL TRANSCRIPT', { align: 'center' })
         .moveDown(2);

      // Student Information
      doc.fontSize(14)
         .font('Helvetica')
         .text(`Student Name: ${student.name}`, { align: 'left' })
         .text(`Email: ${student.email}`, { align: 'left' })
         .text(`Date Generated: ${new Date().toLocaleDateString()}`, { align: 'left' })
         .moveDown(2);

      // Course List
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('COURSE COMPLETIONS', { align: 'left' })
         .moveDown(1);

      // Table header
      let y = doc.y;
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Course', 50, y)
         .text('Date Completed', 300, y)
         .text('Grade', 450, y)
         .text('Credits', 500, y)
         .moveDown(0.5);

      // Draw line
      y = doc.y;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      doc.moveDown(0.5);

      // Course rows
      doc.font('Helvetica')
         .fontSize(10);

      courseData.forEach((course, index) => {
        if (doc.y > 700) {
          doc.addPage();
          y = 50;
        }
        
        y = doc.y;
        doc.text(course.courseTitle, 50, y, { width: 240 })
           .text(new Date(course.completedDate).toLocaleDateString(), 300, y, { width: 140 })
           .text(course.grade, 450, y, { width: 40 })
           .text(course.credits.toString(), 500, y, { width: 40 })
           .moveDown(0.5);
      });

      // Summary
      doc.moveDown(2)
         .font('Helvetica-Bold')
         .fontSize(12)
         .text(`Total Credits: ${totalCredits}`, { align: 'left' });
      
      if (gpa !== null) {
        doc.text(`GPA: ${gpa.toFixed(2)}`, { align: 'left' });
      }

      // Footer
      const pageHeight = doc.page.height;
      doc.fontSize(8)
         .font('Helvetica')
         .text(
           'This is an official transcript generated by OECS Learning Hub',
           50,
           pageHeight - 50,
           { align: 'left', width: 500 }
         );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

