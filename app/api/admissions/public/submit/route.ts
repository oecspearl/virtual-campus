import { NextRequest, NextResponse } from 'next/server';
import { submitApplication } from '@/lib/admissions/admission-service';

export async function POST(request: NextRequest) {
  try {
    const { slug, applicant_name, applicant_email, applicant_phone, answers } = await request.json();

    if (!slug || !applicant_name || !applicant_email) {
      return NextResponse.json({ error: 'Slug, name, and email are required' }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant_email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const result = await submitApplication(
      slug,
      { name: applicant_name, email: applicant_email, phone: applicant_phone },
      answers || []
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ access_token: result.access_token }, { status: 201 });
  } catch (error) {
    console.error('Public submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
