import { NextRequest, NextResponse } from 'next/server';
import { getApplicationStatus } from '@/lib/admissions/admission-service';

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const result = await getApplicationStatus(token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Public status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
