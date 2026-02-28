import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { sendEmail, wrapEmailTemplate } from '@/lib/email-service';

// ---------------------------------------------------------------------------
// Programme Application Service
// ---------------------------------------------------------------------------
// Handles the full lifecycle of programme applications:
//   - Public form data retrieval (getApplicationFormData)
//   - Application submission with validation (submitApplication)
//   - Staff review with optional auto-enrollment (reviewApplication)
//   - Bulk review operations (bulkReviewApplications)
// ---------------------------------------------------------------------------

/**
 * Submit an application for a programme via a recipient token.
 *
 * 1. Looks up the recipient by application_token
 * 2. Validates the campaign is an application campaign with status 'sent'
 * 3. Prevents duplicate submissions
 * 4. Validates required fields are answered
 * 5. Inserts the application record
 * 6. Sends a confirmation email to the applicant
 */
export async function submitApplication(
  token: string,
  answers: any[]
): Promise<{ success: boolean; application?: any; error?: string }> {
  const supabase = createServiceSupabaseClient();

  // 1. Look up recipient by application_token
  const { data: recipient, error: recipientError } = await supabase
    .from('crm_campaign_recipients')
    .select('*')
    .eq('application_token', token)
    .single();

  if (recipientError || !recipient) {
    return { success: false, error: 'Invalid or expired application token' };
  }

  // 2. Get campaign and verify it is an application campaign with status 'sent'
  const { data: campaign, error: campaignError } = await supabase
    .from('crm_campaigns')
    .select('*')
    .eq('id', recipient.campaign_id)
    .single();

  if (campaignError || !campaign) {
    return { success: false, error: 'Campaign not found' };
  }

  if (campaign.metadata?.campaign_type !== 'application') {
    return { success: false, error: 'This campaign is not an application campaign' };
  }

  if (campaign.status !== 'sent') {
    return { success: false, error: 'This application campaign is no longer accepting submissions' };
  }

  // 3. Get programme_id from campaign metadata
  const programmeId = campaign.metadata?.programme_id;
  if (!programmeId) {
    return { success: false, error: 'Campaign is missing programme configuration' };
  }

  // 4. Get programme title
  const { data: programme, error: progError } = await supabase
    .from('programmes')
    .select('id, title')
    .eq('id', programmeId)
    .single();

  if (progError || !programme) {
    return { success: false, error: 'Programme not found' };
  }

  // 5. Check for existing application (same campaign_id + recipient_id)
  const { data: existingApplication } = await supabase
    .from('programme_applications')
    .select('id')
    .eq('campaign_id', campaign.id)
    .eq('recipient_id', recipient.id)
    .single();

  if (existingApplication) {
    return { success: false, error: 'You have already submitted an application for this programme' };
  }

  // 6. Get form fields for this campaign
  const { data: fields } = await supabase
    .from('programme_application_fields')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('order', { ascending: true });

  // 7. Validate required fields are answered
  if (fields && fields.length > 0) {
    const answeredFieldIds = new Set(
      answers
        .filter((a: any) => {
          if (!a.field_id) return false;
          const val = a.answer ?? a.value;
          return val !== undefined && val !== null && val !== '';
        })
        .map((a: any) => a.field_id)
    );

    const missingRequired = fields.filter(
      (f) => f.required && !answeredFieldIds.has(f.id)
    );

    if (missingRequired.length > 0) {
      const missingNames = missingRequired.map((f) => f.question_text).join(', ');
      return {
        success: false,
        error: `Please answer all required questions: ${missingNames}`,
      };
    }
  }

  // Look up applicant name from users table
  let applicantName = recipient.email;
  if (recipient.student_id) {
    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', recipient.student_id)
      .single();
    if (user?.name) {
      applicantName = user.name;
    }
  }

  // 8. Insert the application
  const { data: application, error: insertError } = await supabase
    .from('programme_applications')
    .insert({
      campaign_id: campaign.id,
      programme_id: programme.id,
      recipient_id: recipient.id,
      applicant_id: recipient.student_id,
      applicant_email: recipient.email,
      applicant_name: applicantName,
      answers,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting application:', insertError);
    return { success: false, error: 'Failed to submit application' };
  }

  // 9. Send confirmation email to applicant
  try {
    const emailContent = `
      <h2 style="color: #1e293b; margin-bottom: 16px;">Application Received</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Thank you for submitting your application for <strong>${programme.title}</strong>.
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        We have received your application and it is currently under review. You will be notified
        once a decision has been made.
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 24px;">
        If you have any questions in the meantime, please contact the programme administration.
      </p>
    `;

    await sendEmail({
      to: recipient.email,
      subject: `Application Received — ${programme.title}`,
      html: wrapEmailTemplate(emailContent, { title: `Application Received — ${programme.title}` }),
    });
  } catch (emailError) {
    // Log but do not fail the submission because of an email error
    console.error('Failed to send application confirmation email:', emailError);
  }

  // 10. Return the created application
  return { success: true, application };
}

/**
 * Review a single application (approve, reject, or waitlist).
 *
 * - If already approved or rejected, prevents re-review.
 * - On approval, auto-enrolls the applicant in the programme.
 * - Sends the appropriate notification email.
 */
export async function reviewApplication(
  applicationId: string,
  decision: 'approved' | 'rejected' | 'waitlisted',
  reviewerId: string,
  notes?: string
): Promise<{ success: boolean; application?: any; error?: string }> {
  const supabase = createServiceSupabaseClient();

  // 1. Fetch the application
  const { data: application, error: fetchError } = await supabase
    .from('programme_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !application) {
    return { success: false, error: 'Application not found' };
  }

  // 2. Prevent re-review of already finalized applications
  if (application.status === 'approved' || application.status === 'rejected') {
    return {
      success: false,
      error: `Application has already been ${application.status} and cannot be reviewed again`,
    };
  }

  // 3. Update the application with the review decision
  const { data: updatedApplication, error: updateError } = await supabase
    .from('programme_applications')
    .update({
      status: decision,
      reviewed_by: reviewerId,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating application:', updateError);
    return { success: false, error: 'Failed to update application' };
  }

  // 4. If approved, enroll the applicant in the programme
  if (decision === 'approved') {
    const { data: enrollment, error: enrollError } = await supabase
      .from('programme_enrollments')
      .insert({
        programme_id: application.programme_id,
        student_id: application.applicant_id,
        status: 'active',
      })
      .select()
      .single();

    if (enrollError) {
      console.error('Error enrolling applicant:', enrollError);
      // Do not fail the review; enrollment can be retried manually
    } else if (enrollment) {
      // Link the enrollment to the application
      await supabase
        .from('programme_applications')
        .update({ enrollment_id: enrollment.id, updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      // Reflect enrollment_id on the returned object
      updatedApplication.enrollment_id = enrollment.id;
    }
  }

  // 5. Get programme title for the email
  const { data: programme } = await supabase
    .from('programmes')
    .select('id, title')
    .eq('id', application.programme_id)
    .single();

  const programmeTitle = programme?.title || 'the programme';

  // 6. Send notification email based on the decision
  try {
    let subject: string;
    let emailContent: string;

    if (decision === 'approved') {
      subject = `Congratulations! Your Application has been Approved — ${programmeTitle}`;
      emailContent = `
        <h2 style="color: #16a34a; margin-bottom: 16px;">Application Approved</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Congratulations! Your application for <strong>${programmeTitle}</strong> has been approved.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          You have been automatically enrolled in the programme. You can now access the programme
          and its courses from your dashboard.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 24px;">
          Welcome aboard! We look forward to supporting you on your learning journey.
        </p>
      `;
    } else if (decision === 'rejected') {
      subject = `Application Update — ${programmeTitle}`;
      emailContent = `
        <h2 style="color: #1e293b; margin-bottom: 16px;">Application Update</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Thank you for your interest in <strong>${programmeTitle}</strong>.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          After careful review, we regret to inform you that your application has not been
          approved at this time.
        </p>
        ${
          notes
            ? `<p style="color: #475569; font-size: 16px; line-height: 1.6;"><strong>Reason:</strong> ${notes}</p>`
            : ''
        }
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 24px;">
          If you have any questions or would like to discuss this further, please do not hesitate
          to contact us.
        </p>
      `;
    } else {
      // waitlisted
      subject = `Application Update — ${programmeTitle}`;
      emailContent = `
        <h2 style="color: #d97706; margin-bottom: 16px;">Application Update</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Thank you for your application to <strong>${programmeTitle}</strong>.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Your application has been placed on the waitlist. We will notify you if a spot becomes
          available.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 24px;">
          Thank you for your patience and continued interest.
        </p>
      `;
    }

    await sendEmail({
      to: application.applicant_email,
      subject,
      html: wrapEmailTemplate(emailContent, { title: subject }),
    });
  } catch (emailError) {
    console.error('Failed to send review notification email:', emailError);
  }

  // 7. Return the updated application
  return { success: true, application: updatedApplication };
}

/**
 * Bulk-review multiple applications with the same decision.
 *
 * Iterates through each application ID and calls reviewApplication individually.
 * Returns a summary of processed and failed counts along with per-item results.
 */
export async function bulkReviewApplications(
  applicationIds: string[],
  decision: 'approved' | 'rejected' | 'waitlisted',
  reviewerId: string,
  notes?: string
): Promise<{ processed: number; failed: number; results: Array<{ id: string; success: boolean; error?: string }> }> {
  let processed = 0;
  let failed = 0;
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const applicationId of applicationIds) {
    try {
      const result = await reviewApplication(applicationId, decision, reviewerId, notes);
      if (result.success) {
        processed++;
        results.push({ id: applicationId, success: true });
      } else {
        failed++;
        results.push({ id: applicationId, success: false, error: result.error });
      }
    } catch (error: any) {
      failed++;
      results.push({ id: applicationId, success: false, error: error.message || 'Unknown error' });
      console.error(`Failed to review application ${applicationId}:`, error);
    }
  }

  return { processed, failed, results };
}

/**
 * Get the full application form data for a given recipient token.
 *
 * Used by the public-facing application form page to render
 * the programme details and form fields, or to show an "already applied" state.
 */
export async function getApplicationFormData(token: string): Promise<{
  success: boolean;
  data?: {
    campaign: any;
    programme: { id: string; title: string; description: string | null; thumbnail: string | null };
    fields: any[];
    recipient_name: string;
    recipient_email: string;
    already_applied: boolean;
  };
  error?: string;
}> {
  const supabase = createServiceSupabaseClient();

  // 1. Look up recipient by application_token
  const { data: recipient, error: recipientError } = await supabase
    .from('crm_campaign_recipients')
    .select('*')
    .eq('application_token', token)
    .single();

  if (recipientError || !recipient) {
    return { success: false, error: 'Invalid or expired application token' };
  }

  // 2. Get campaign with metadata
  const { data: campaign, error: campaignError } = await supabase
    .from('crm_campaigns')
    .select('*')
    .eq('id', recipient.campaign_id)
    .single();

  if (campaignError || !campaign) {
    return { success: false, error: 'Campaign not found' };
  }

  // 3. Verify campaign_type is 'application' and status is 'sent'
  if (campaign.metadata?.campaign_type !== 'application') {
    return { success: false, error: 'This is not an application campaign' };
  }

  if (campaign.status !== 'sent') {
    return { success: false, error: 'This application campaign is no longer accepting submissions' };
  }

  // 4. Get programme info
  const programmeId = campaign.metadata?.programme_id;
  if (!programmeId) {
    return { success: false, error: 'Campaign is missing programme configuration' };
  }

  const { data: programme, error: progError } = await supabase
    .from('programmes')
    .select('id, title, description, thumbnail')
    .eq('id', programmeId)
    .single();

  if (progError || !programme) {
    return { success: false, error: 'Programme not found' };
  }

  // 5. Get form fields ordered by "order"
  const { data: fields } = await supabase
    .from('programme_application_fields')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('order', { ascending: true });

  // 6. Check if the recipient has already applied
  const { data: existingApplication } = await supabase
    .from('programme_applications')
    .select('id')
    .eq('campaign_id', campaign.id)
    .eq('recipient_id', recipient.id)
    .single();

  const alreadyApplied = !!existingApplication;

  // Look up the recipient's name from the users table
  let recipientName = recipient.email;
  const { data: user } = await supabase
    .from('users')
    .select('name')
    .eq('id', recipient.student_id)
    .single();

  if (user?.name) {
    recipientName = user.name;
  }

  // 7. Return the form data
  return {
    success: true,
    data: {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        metadata: campaign.metadata,
      },
      programme: {
        id: programme.id,
        title: programme.title,
        description: programme.description,
        thumbnail: programme.thumbnail,
      },
      fields: fields || [],
      recipient_name: recipientName,
      recipient_email: recipient.email,
      already_applied: alreadyApplied,
    },
  };
}
