import { NextRequest, NextResponse } from 'next/server';
import { submitApplication } from '@/lib/crm/application-service';

/**
 * POST /api/applications/submit
 * Public: submit a programme application (NO AUTH REQUIRED).
 * Body: { token: string, answers: [{ field_id: string, answer: any }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, answers } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'answers array is required' }, { status: 400 });
    }

    const result = await submitApplication(token, answers);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Submission failed' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      application_id: result.application?.id,
    });
  } catch (error: any) {
    console.error('Application Submit: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
