import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/certificates/verify/[code]
 * Public endpoint to verify a certificate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Get certificate with related data
    const { data: certificate, error } = await serviceSupabase
      .from('certificates')
      .select(`
        *,
        student:users!certificates_student_id_fkey(name, email),
        course:courses!certificates_course_id_fkey(title, description)
      `)
      .eq('verification_code', code.toUpperCase())
      .single();

    if (error || !certificate) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Certificate not found or invalid verification code' 
        },
        { status: 404 }
      );
    }

    // Check if certificate is expired (if expiration is set)
    const isExpired = certificate.expires_at 
      ? new Date(certificate.expires_at) < new Date()
      : false;

    return NextResponse.json({
      valid: !isExpired,
      expired: isExpired,
      certificate: {
        id: certificate.id,
        studentName: (certificate.student as any)?.name,
        courseName: (certificate.course as any)?.title,
        issuedAt: certificate.issued_at,
        expiresAt: certificate.expires_at,
        gradePercentage: certificate.grade_percentage,
        verificationCode: certificate.verification_code
      }
    });

  } catch (error: any) {
    console.error('Certificate verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify certificate' },
      { status: 500 }
    );
  }
}

