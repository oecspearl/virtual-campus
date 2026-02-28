import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/student/calendar
 * Get calendar events for the current student
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const eventType = searchParams.get('type');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('student_calendar_events')
      .select('*')
      .eq('student_id', user.id)
      .order('start_datetime', { ascending: true });

    if (startDate) {
      query = query.gte('start_datetime', startDate);
    }

    if (endDate) {
      query = query.lte('start_datetime', endDate);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error('Error in calendar GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/student/calendar
 * Create a new calendar event
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      location,
      start_datetime,
      end_datetime,
      all_day,
      event_type,
      reminder_minutes,
      recurrence_rule,
      color,
    } = body;

    if (!title || !start_datetime) {
      return NextResponse.json({
        error: 'title and start_datetime are required'
      }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: event, error } = await tq
      .from('student_calendar_events')
      .insert({
        student_id: user.id,
        title,
        description,
        location,
        start_datetime,
        end_datetime,
        all_day: all_day || false,
        event_type: event_type || 'custom',
        reminder_minutes: reminder_minutes || null,
        recurrence_rule: recurrence_rule || null,
        color: color || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error in calendar POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
