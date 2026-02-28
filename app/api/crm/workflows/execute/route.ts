import { NextRequest, NextResponse } from 'next/server';
import { processEventTriggers, EventType } from '@/lib/crm/workflow-engine';

/**
 * POST /api/crm/workflows/execute
 * Internal trigger endpoint (called by other API routes or cron).
 * Body: { event_type, student_id, event_data? }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event_type, student_id, event_data } = body;

    if (!event_type || !student_id) {
      return NextResponse.json({ error: 'event_type and student_id are required' }, { status: 400 });
    }

    await processEventTriggers(event_type as EventType, student_id, event_data || {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('CRM Workflow Execute: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
