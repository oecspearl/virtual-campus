import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database-helpers';
import { hasRole } from '@/lib/rbac';
import { generateCertificatePDF } from '@/lib/certificates/generator';

/**
 * POST /api/admin/certificates/templates/preview
 * Generate a preview PDF of a certificate template with sample data
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can preview templates
    if (!hasRole(user.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { template_html, logo_url } = body;

    if (!template_html) {
      return NextResponse.json(
        { error: 'Template HTML is required' },
        { status: 400 }
      );
    }

    // Generate sample certificate data for preview
    const sampleData = {
      studentName: 'John Doe',
      courseName: 'Sample Course Name',
      completionDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      gradePercentage: 95,
      verificationCode: 'PREVIEW-12345',
      logoUrl: logo_url || undefined
    };

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF(sampleData, template_html);

    // Return PDF as base64 for preview
    return NextResponse.json({
      preview: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf'
    });

  } catch (error: any) {
    console.error('Preview generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate preview' },
      { status: 500 }
    );
  }
}

