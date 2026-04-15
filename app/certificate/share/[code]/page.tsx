import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import CertificateShareView from '@/app/components/certificate/CertificateShareView';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  
  try {
    const serviceSupabase = createServiceSupabaseClient();
    
    const { data: certificate } = await serviceSupabase
      .from('certificates')
      .select(`
        *,
        student:users!certificates_student_id_fkey(name),
        course:courses!certificates_course_id_fkey(title, description)
      `)
      .eq('verification_code', code.toUpperCase())
      .single();

    if (!certificate) {
      return {
        title: 'Certificate Not Found',
      };
    }

    const studentName = (certificate.student as any)?.name || 'Student';
    const courseName = (certificate.course as any)?.title || 'Course';
    const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const description = `${studentName} has successfully completed the course "${courseName}" on ${issuedDate}.`;

    // Get base URL from environment or use default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const shareUrl = `${baseUrl}/certificate/share/${code}`;
    const imageUrl = certificate.pdf_url || `${baseUrl}/api/certificates/share/${code}/image`;

    return {
      title: `${courseName} - Certificate of Completion`,
      description,
      openGraph: {
        title: `${studentName} completed ${courseName}`,
        description,
        type: 'website',
        url: shareUrl,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${courseName} Certificate`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${studentName} completed ${courseName}`,
        description,
        images: [imageUrl],
      },
      // LinkedIn specific metadata
      other: {
        'og:site_name': 'OECS Learning Hub',
        'og:type': 'article',
        'article:author': studentName,
        'article:published_time': certificate.issued_at,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Certificate Share',
    };
  }
}

export default async function CertificateSharePage({ params }: PageProps) {
  const { code } = await params;

  const serviceSupabase = createServiceSupabaseClient();
  
  const { data: certificate, error } = await serviceSupabase
    .from('certificates')
    .select(`
      *,
      student:users!certificates_student_id_fkey(id, name, email),
      course:courses!certificates_course_id_fkey(id, title, description, thumbnail)
    `)
    .eq('verification_code', code.toUpperCase())
    .single();

  if (error || !certificate) {
    notFound();
  }

  const certificateData = {
    id: certificate.id,
    studentName: (certificate.student as any)?.name || 'Student',
    courseName: (certificate.course as any)?.title || 'Course',
    courseDescription: (certificate.course as any)?.description,
    issuedAt: certificate.issued_at,
    gradePercentage: certificate.grade_percentage,
    verificationCode: certificate.verification_code,
    pdfUrl: certificate.pdf_url,
    courseThumbnail: (certificate.course as any)?.thumbnail,
  };

  return <CertificateShareView certificate={certificateData} />;
}

