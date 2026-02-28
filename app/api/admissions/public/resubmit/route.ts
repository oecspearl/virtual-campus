import { NextRequest, NextResponse } from 'next/server';
import { resubmitApplication } from '@/lib/admissions/admission-service';

export async function POST(request: NextRequest) {
  try {
    const { access_token, answers } = await request.json();

    if (!access_token) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers must be an array' }, { status: 400 });
    }

    const result = await resubmitApplication(access_token, answers);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Application resubmitted successfully' });
  } catch (error) {
    console.error('Public resubmit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
