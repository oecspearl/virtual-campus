/**
 * Proctoring Event API
 * Record proctoring events (violations, flags, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordProctoringEvent } from '@/lib/proctoring/integration';
import { authenticateUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, event_type, severity, metadata } = body;

    if (!session_id || !event_type) {
      return NextResponse.json({ error: 'session_id and event_type are required' }, { status: 400 });
    }

    await recordProctoringEvent(
      session_id,
      event_type,
      severity || 'low',
      metadata
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Proctoring event recording error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record event' }, { status: 500 });
  }
}

