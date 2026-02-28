import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { sendEmail, replaceTemplateVariables } from '@/lib/email-service';

/**
 * Send a campaign to all members of its linked segment.
 */
export async function sendCampaign(campaignId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  const supabase = createServiceSupabaseClient();

  // Fetch campaign
  const { data: campaign, error: campError } = await supabase
    .from('crm_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campError || !campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'sent' || campaign.status === 'sending') {
    throw new Error(`Campaign is already ${campaign.status}`);
  }

  // Mark as sending
  await supabase
    .from('crm_campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', campaignId);

  // Get recipients from segment members
  let recipients: { student_id: string; email: string; name: string }[] = [];

  if (campaign.segment_id) {
    const { data: members } = await supabase
      .from('crm_segment_members')
      .select('student_id, users!crm_segment_members_student_id_fkey(email, name)')
      .eq('segment_id', campaign.segment_id);

    recipients = (members || []).map((m: any) => ({
      student_id: m.student_id,
      email: m.users?.email || '',
      name: m.users?.name || 'Student',
    })).filter(r => r.email);
  }

  if (recipients.length === 0) {
    await supabase
      .from('crm_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        stats: { total: 0, sent: 0, failed: 0, opened: 0, clicked: 0 },
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    return { total: 0, sent: 0, failed: 0 };
  }

  // Insert recipient records
  await supabase.from('crm_campaign_recipients').insert(
    recipients.map(r => ({
      campaign_id: campaignId,
      student_id: r.student_id,
      email: r.email,
      status: 'pending',
    }))
  );

  // For application campaigns, fetch application tokens for personalized links
  const isApplicationCampaign = campaign.metadata?.campaign_type === 'application';
  const tokenMap: Record<string, string> = {};

  if (isApplicationCampaign) {
    const { data: recipientTokens } = await supabase
      .from('crm_campaign_recipients')
      .select('student_id, application_token')
      .eq('campaign_id', campaignId);

    for (const rt of recipientTokens || []) {
      if (rt.student_id && rt.application_token) {
        tokenMap[rt.student_id] = rt.application_token;
      }
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org';

  let sent = 0;
  let failed = 0;

  // Send emails
  for (const recipient of recipients) {
    try {
      const variables: Record<string, string> = {
        student_name: recipient.name,
        student_email: recipient.email,
      };

      // Add application link for application campaigns
      if (isApplicationCampaign && tokenMap[recipient.student_id]) {
        variables.application_link = `${appUrl}/apply/${campaignId}?token=${tokenMap[recipient.student_id]}`;
      }

      const personalizedHtml = replaceTemplateVariables(campaign.body_html, variables);
      const personalizedSubject = replaceTemplateVariables(campaign.subject, variables);
      const personalizedText = campaign.body_text
        ? replaceTemplateVariables(campaign.body_text, variables)
        : undefined;

      const result = await sendEmail({
        to: recipient.email,
        subject: personalizedSubject,
        html: personalizedHtml,
        text: personalizedText,
        tags: [{ name: 'campaign_id', value: campaignId }],
      });

      if (result.success) {
        sent++;
        await supabase
          .from('crm_campaign_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('campaign_id', campaignId)
          .eq('student_id', recipient.student_id);
      } else {
        failed++;
        await supabase
          .from('crm_campaign_recipients')
          .update({ status: 'failed', error_message: result.error || 'Send failed' })
          .eq('campaign_id', campaignId)
          .eq('student_id', recipient.student_id);
      }
    } catch (error: any) {
      failed++;
      await supabase
        .from('crm_campaign_recipients')
        .update({ status: 'failed', error_message: error.message || 'Unknown error' })
        .eq('campaign_id', campaignId)
        .eq('student_id', recipient.student_id);
    }
  }

  // Update campaign stats
  const finalStatus = failed === recipients.length ? 'failed' : failed > 0 ? 'partial' : 'sent';
  await supabase
    .from('crm_campaigns')
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      stats: { total: recipients.length, sent, failed, opened: 0, clicked: 0 },
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  return { total: recipients.length, sent, failed };
}

/**
 * Process all scheduled campaigns that are due.
 */
export async function processScheduledCampaigns(): Promise<{
  processed: number;
  errors: number;
}> {
  const supabase = createServiceSupabaseClient();

  const { data: dueCampaigns } = await supabase
    .from('crm_campaigns')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString());

  let processed = 0;
  let errors = 0;

  for (const campaign of dueCampaigns || []) {
    try {
      await sendCampaign(campaign.id);
      processed++;
    } catch (error) {
      console.error(`Failed to send campaign ${campaign.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}
