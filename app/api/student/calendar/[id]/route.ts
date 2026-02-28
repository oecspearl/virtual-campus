import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/student/calendar/[id]
 * Get a single calendar event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: event, error } = await tq
      .from('student_calendar_events')
      .select('*')
      .eq('id', id)
      .eq('student_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      console.error('Error fetching event:', error);
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in calendar event GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/student/calendar/[id]
 * Update a calendar event
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
      reminder_minutes,
      recurrence_rule,
      color,
    } = body;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if event is synced (can't edit synced events)
    const { data: existing } = await tq
      .from('student_calendar_events')
      .select('is_synced')
      .eq('id', id)
      .eq('student_id', user.id)
      .single();

    if (existing?.is_synced) {
      return NextResponse.json({
        error: 'Cannot edit synced events'
      }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (start_datetime !== undefined) updateData.start_datetime = start_datetime;
    if (end_datetime !== undefined) updateData.end_datetime = end_datetime;
    if (all_day !== undefined) updateData.all_day = all_day;
    if (reminder_minutes !== undefined) updateData.reminder_minutes = reminder_minutes;
    if (recurrence_rule !== undefined) updateData.recurrence_rule = recurrence_rule;
    if (color !== undefined) updateData.color = color;

    const { data: event, error } = await tq
      .from('student_calendar_events')
      .update(updateData)
      .eq('id', id)
      .eq('student_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in calendar event PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/student/calendar/[id]
 * Delete a calendar event
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from('student_calendar_events')
      .delete()
      .eq('id', id)
      .eq('student_id', user.id);

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in calendar event DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
