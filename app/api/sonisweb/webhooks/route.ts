import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { syncStudents } from '@/lib/sonisweb/student-sync';
import { syncEnrollments } from '@/lib/sonisweb/enrollment-sync';
import type { SonisWebConnection } from '@/lib/sonisweb/types';

/**
 * POST /api/sonisweb/webhooks
 *
 * Receives webhook events from SonisWeb instances.
 * Validates via shared secret from connection settings.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, connection_id, data: eventData } = body;

    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // Look up connection if connection_id provided
    let connection: SonisWebConnection | null = null;
    let tenantId: string | null = null;

    if (connection_id) {
      const { data } = await supabase
        .from('sonisweb_connections')
        .select('*')
        .eq('id', connection_id)
        .single();

      connection = data as SonisWebConnection | null;
      tenantId = connection?.tenant_id || null;
    }

    // Validate webhook secret if configured
    if (connection?.settings?.webhook_secret) {
      const providedSecret = request.headers.get('x-webhook-secret') || body.secret;
      if (providedSecret !== connection.settings.webhook_secret) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 403 });
      }
    }

    // Get client IP for audit
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || null;

    // Log the webhook event
    const { data: webhookEvent, error: logError } = await supabase
      .from('sonisweb_webhook_events')
      .insert({
        tenant_id: tenantId || '00000000-0000-0000-0000-000000000001',
        connection_id: connection_id || null,
        event_type,
        payload: eventData || body,
        headers: Object.fromEntries(
          ['content-type', 'user-agent', 'x-webhook-secret'].map(h => [h, request.headers.get(h)])
        ),
        status: 'received',
        ip_address: ipAddress,
      })
      .select('id')
      .single();

    const eventId = webhookEvent?.id;

    // Process the event
    if (!connection || !tenantId) {
      // Can't process without connection context
      if (eventId) {
        await supabase
          .from('sonisweb_webhook_events')
          .update({ status: 'ignored', error_message: 'No connection found' })
          .eq('id', eventId);
      }
      return NextResponse.json({ received: true, processed: false });
    }

    // Update status to processing
    if (eventId) {
      await supabase
        .from('sonisweb_webhook_events')
        .update({ status: 'processing' })
        .eq('id', eventId);
    }

    let processingResult: Record<string, any> = {};
    let finalStatus = 'processed';

    try {
      switch (event_type) {
        case 'student.created':
        case 'student.updated':
        case 'student.deleted': {
          const result = await syncStudents(connection_id, tenantId, undefined, 'webhook');
          processingResult = { sync_type: 'students', result };
          break;
        }
        case 'enrollment.created':
        case 'enrollment.updated':
        case 'enrollment.deleted': {
          const result = await syncEnrollments(connection_id, tenantId, undefined, 'webhook');
          processingResult = { sync_type: 'enrollments', result };
          break;
        }
        default:
          finalStatus = 'ignored';
          processingResult = { reason: `Unhandled event type: ${event_type}` };
      }
    } catch (processError: any) {
      finalStatus = 'failed';
      processingResult = { error: processError.message };
    }

    // Update webhook event with result
    if (eventId) {
      await supabase
        .from('sonisweb_webhook_events')
        .update({
          status: finalStatus,
          processing_result: processingResult,
          processed_at: new Date().toISOString(),
          error_message: finalStatus === 'failed' ? processingResult.error : null,
        })
        .eq('id', eventId);
    }

    return NextResponse.json({
      received: true,
      processed: finalStatus === 'processed',
      event_id: eventId,
    });
  } catch (error: any) {
    console.error('SonisWeb webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
