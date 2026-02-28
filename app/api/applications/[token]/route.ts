import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/applications/[token]
 * Public: get application form data by token (NO AUTH REQUIRED).
 * Returns programme info, fields, recipient name, and whether already applied.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const supabase = createServiceSupabaseClient();

    // Look up recipient by application token
    const { data: recipient, error: recipientError } = await supabase
      .from('crm_campaign_recipients')
      .select('id, campaign_id, student_id, email, status')
      .eq('application_token', token)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json({ error: 'Invalid application token' }, { status: 404 });
    }

    // Get the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('crm_campaigns')
      .select('id, name, status, metadata')
      .eq('id', recipient.campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify this is an application campaign
    if (campaign.metadata?.campaign_type !== 'application') {
      return NextResponse.json(
        { error: 'This campaign does not accept applications' },
        { status: 400 }
      );
    }

    // Verify campaign has been sent (is active)
    if (campaign.status !== 'sent') {
      return NextResponse.json(
        { error: 'This campaign is no longer accepting applications' },
        { status: 400 }
      );
    }

    // Get programme details
    const programmeId = campaign.metadata?.programme_id;
    let programme = null;

    if (programmeId) {
      const { data: prog } = await supabase
        .from('programmes')
        .select('id, title, description, thumbnail')
        .eq('id', programmeId)
        .single();

      programme = prog;
    }

    // Get application fields ordered by "order"
    const { data: fields } = await supabase
      .from('programme_application_fields')
      .select('*')
      .eq('campaign_id', recipient.campaign_id)
      .order('order', { ascending: true });

    // Get recipient name from user record if available
    let recipientName = '';
    if (recipient.student_id) {
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', recipient.student_id)
        .single();

      recipientName = user?.name || '';
    }

    // Check if an application already exists for this recipient + campaign
    const { data: existingApp } = await supabase
      .from('programme_applications')
      .select('id')
      .eq('campaign_id', recipient.campaign_id)
      .eq('recipient_id', recipient.id)
      .single();

    const alreadyApplied = !!existingApp;

    // Transform fields to match the form page's expected interface
    const transformedFields = (fields || []).map((f: any) => ({
      id: f.id,
      field_type: f.type,
      label: f.question_text,
      description: f.description || null,
      is_required: f.required ?? true,
      display_order: f.order ?? 0,
      options: f.type === 'multiple_choice' || f.type === 'multiple_select'
        ? (f.options?.choices || []).map((c: string, idx: number) => ({ id: String(idx), text: c }))
        : f.type === 'rating_scale'
          ? [
              { id: String(f.options?.min ?? 1), text: `Min: ${f.options?.min ?? 1}` },
              { id: String(f.options?.max ?? 5), text: `Max: ${f.options?.max ?? 5}` },
            ]
          : null,
    }));

    return NextResponse.json({
      programme_id: programme?.id || null,
      programme_title: programme?.title || null,
      programme_description: programme?.description || null,
      programme_thumbnail: programme?.thumbnail || null,
      campaign_name: campaign.name || '',
      recipient_name: recipientName,
      already_applied: alreadyApplied,
      fields: transformedFields,
    });
  } catch (error: any) {
    console.error('Application Token GET: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
