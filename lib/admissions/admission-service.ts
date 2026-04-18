import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { sendEmail, wrapEmailTemplate } from '@/lib/email-service';
import { generateSecurePassword } from '@/lib/crypto-random';

// ─── Types ───────────────────────────────────────────────────

export interface AdmissionForm {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  programme_id: string | null;
  status: 'draft' | 'published' | 'closed';
  settings: {
    deadline?: string;
    max_applications?: number;
    require_documents?: boolean;
    confirmation_message?: string;
    sections?: Array<{ name: string; description?: string }>;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdmissionFormField {
  id: string;
  form_id: string;
  type: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  order: number;
  required: boolean;
  options: Record<string, unknown>;
  section: string | null;
}

export interface AdmissionApplication {
  id: string;
  form_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  answers: Array<{ field_id: string; answer: unknown }>;
  access_token: string;
  status: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  change_request_message: string | null;
  user_id: string | null;
  enrollment_id: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const generateTempPassword = (): string => generateSecurePassword(12);

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

// ─── Service Functions ───────────────────────────────────────

/**
 * Fetch a published form by slug with ordered fields. Checks deadline.
 */
export async function getPublicForm(slug: string): Promise<{
  success: boolean;
  data?: { form: AdmissionForm; fields: AdmissionFormField[] };
  error?: string;
}> {
  const supabase = createServiceSupabaseClient();

  const { data: form, error: formError } = await supabase
    .from('admission_forms')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (formError || !form) {
    return { success: false, error: 'Form not found or not available' };
  }

  // Check deadline
  if (form.settings?.deadline) {
    const deadline = new Date(form.settings.deadline);
    if (deadline < new Date()) {
      return { success: false, error: 'The application deadline has passed' };
    }
  }

  // Check max applications
  if (form.settings?.max_applications) {
    const { count } = await supabase
      .from('admission_applications')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', form.id)
      .neq('status', 'withdrawn');

    if (count !== null && count >= form.settings.max_applications) {
      return { success: false, error: 'This form has reached the maximum number of applications' };
    }
  }

  const { data: fields } = await supabase
    .from('admission_form_fields')
    .select('*')
    .eq('form_id', form.id)
    .order('order', { ascending: true });

  return {
    success: true,
    data: { form, fields: fields || [] },
  };
}

/**
 * Submit a new application. Validates form, required fields, duplicates.
 * Returns access_token for status tracking.
 */
export async function submitApplication(
  slug: string,
  applicantInfo: { name: string; email: string; phone?: string },
  answers: Array<{ field_id: string; answer: unknown }>
): Promise<{ success: boolean; access_token?: string; error?: string }> {
  const supabase = createServiceSupabaseClient();

  // Fetch form
  const { data: form } = await supabase
    .from('admission_forms')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!form) {
    return { success: false, error: 'Form not found or not accepting applications' };
  }

  // Check deadline
  if (form.settings?.deadline && new Date(form.settings.deadline) < new Date()) {
    return { success: false, error: 'The application deadline has passed' };
  }

  // Check duplicate
  const { data: existing } = await supabase
    .from('admission_applications')
    .select('id')
    .eq('form_id', form.id)
    .eq('applicant_email', applicantInfo.email.toLowerCase())
    .single();

  if (existing) {
    return { success: false, error: 'An application with this email already exists for this form' };
  }

  // Validate required fields
  const { data: fields } = await supabase
    .from('admission_form_fields')
    .select('id, label, required')
    .eq('form_id', form.id);

  const answeredIds = new Set(
    answers.filter(a => a.field_id && a.answer !== null && a.answer !== undefined && a.answer !== '').map(a => a.field_id)
  );

  const missing = (fields || []).filter(f => f.required && !answeredIds.has(f.id));
  if (missing.length > 0) {
    return { success: false, error: `Required fields missing: ${missing.map(f => f.label).join(', ')}` };
  }

  // Insert application
  const { data: application, error: insertError } = await supabase
    .from('admission_applications')
    .insert({
      form_id: form.id,
      applicant_name: applicantInfo.name,
      applicant_email: applicantInfo.email.toLowerCase(),
      applicant_phone: applicantInfo.phone || null,
      answers,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('id, access_token')
    .single();

  if (insertError || !application) {
    console.error('Error inserting application:', insertError);
    return { success: false, error: 'Failed to submit application' };
  }

  // Insert audit row
  await supabase.from('admission_reviews').insert({
    application_id: application.id,
    reviewer_id: form.created_by,
    old_status: null,
    new_status: 'submitted',
    notes: 'Application submitted by applicant',
  });

  // Send confirmation email
  try {
    const statusUrl = `${getBaseUrl()}/admissions/status?token=${application.access_token}`;
    const confirmationMsg = form.settings?.confirmation_message || 'We have received your application and it is currently under review.';

    const emailContent = `
      <h2 style="color: #1e293b; margin-bottom: 16px;">Application Received</h2>
      <p style="color: #475569; margin-bottom: 12px;">Dear ${applicantInfo.name},</p>
      <p style="color: #475569; margin-bottom: 12px;">Thank you for submitting your application for <strong>${form.title}</strong>.</p>
      <p style="color: #475569; margin-bottom: 20px;">${confirmationMsg}</p>
      <p style="color: #475569; margin-bottom: 8px;">You can check your application status at any time using the link below:</p>
      <p style="margin: 20px 0;"><a href="${statusUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Check Application Status</a></p>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">Your tracking token: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">${application.access_token}</code></p>
    `;

    await sendEmail({
      to: applicantInfo.email,
      subject: `Application Received — ${form.title}`,
      html: wrapEmailTemplate(emailContent, { title: 'Application Received' }),
    });
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError);
  }

  return { success: true, access_token: application.access_token };
}

/**
 * Upload a document for an application.
 */
export async function uploadDocument(
  applicationId: string,
  fieldId: string,
  file: File
): Promise<{ success: boolean; document?: Record<string, unknown>; error?: string }> {
  const supabase = createServiceSupabaseClient();

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File size exceeds 10MB limit' };
  }

  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `admissions/${applicationId}/${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('course-materials')
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return { success: false, error: 'Failed to upload file' };
  }

  const { data: urlData } = supabase.storage.from('course-materials').getPublicUrl(storagePath);

  const { data: doc, error: docError } = await supabase
    .from('admission_documents')
    .insert({
      application_id: applicationId,
      field_id: fieldId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_url: urlData.publicUrl,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (docError) {
    console.error('Doc insert error:', docError);
    return { success: false, error: 'Failed to save document record' };
  }

  return { success: true, document: doc };
}

/**
 * Get application status by access token. Returns full application data for the status portal.
 */
export async function getApplicationStatus(accessToken: string): Promise<{
  success: boolean;
  data?: {
    application: AdmissionApplication;
    form: { title: string; slug: string; programme_id: string | null };
    reviews: Array<{ id: string; old_status: string | null; new_status: string; notes: string | null; created_at: string }>;
    documents: Array<Record<string, unknown>>;
    fields: AdmissionFormField[];
  };
  error?: string;
}> {
  const supabase = createServiceSupabaseClient();

  const { data: application } = await supabase
    .from('admission_applications')
    .select('*')
    .eq('access_token', accessToken)
    .single();

  if (!application) {
    return { success: false, error: 'Application not found. Please check your tracking token.' };
  }

  const { data: form } = await supabase
    .from('admission_forms')
    .select('title, slug, programme_id')
    .eq('id', application.form_id)
    .single();

  const { data: reviews } = await supabase
    .from('admission_reviews')
    .select('id, old_status, new_status, notes, created_at')
    .eq('application_id', application.id)
    .order('created_at', { ascending: true });

  const { data: documents } = await supabase
    .from('admission_documents')
    .select('*')
    .eq('application_id', application.id);

  const { data: fields } = await supabase
    .from('admission_form_fields')
    .select('*')
    .eq('form_id', application.form_id)
    .order('order', { ascending: true });

  return {
    success: true,
    data: {
      application,
      form: form || { title: 'Unknown', slug: '', programme_id: null },
      reviews: reviews || [],
      documents: documents || [],
      fields: fields || [],
    },
  };
}

/**
 * Review an application (under_review, rejected, waitlisted).
 */
export async function reviewApplication(
  appId: string,
  decision: 'under_review' | 'rejected' | 'waitlisted',
  reviewerId: string,
  notes?: string
): Promise<{ success: boolean; application?: Record<string, unknown>; error?: string }> {
  const supabase = createServiceSupabaseClient();

  const { data: application } = await supabase
    .from('admission_applications')
    .select('*')
    .eq('id', appId)
    .single();

  if (!application) {
    return { success: false, error: 'Application not found' };
  }

  if (['approved', 'rejected'].includes(application.status)) {
    return { success: false, error: `Application is already ${application.status}` };
  }

  const oldStatus = application.status;

  const { data: updated, error: updateError } = await supabase
    .from('admission_applications')
    .update({
      status: decision,
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', appId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: 'Failed to update application' };
  }

  // Audit trail
  await supabase.from('admission_reviews').insert({
    application_id: appId,
    reviewer_id: reviewerId,
    old_status: oldStatus,
    new_status: decision,
    notes: notes || null,
  });

  // Send email notification
  try {
    const { data: form } = await supabase
      .from('admission_forms')
      .select('title')
      .eq('id', application.form_id)
      .single();

    const formTitle = form?.title || 'Application';
    const statusUrl = `${getBaseUrl()}/admissions/status?token=${application.access_token}`;
    let subject: string;
    let content: string;

    if (decision === 'under_review') {
      subject = `Application Under Review — ${formTitle}`;
      content = `
        <h2 style="color: #2563eb; margin-bottom: 16px;">Application Under Review</h2>
        <p style="color: #475569;">Dear ${application.applicant_name},</p>
        <p style="color: #475569;">Your application for <strong>${formTitle}</strong> is now being reviewed by our team.</p>
        <p style="color: #475569;">We will notify you once a decision has been made.</p>
        <p style="margin: 20px 0;"><a href="${statusUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Check Status</a></p>
      `;
    } else if (decision === 'rejected') {
      subject = `Application Update — ${formTitle}`;
      content = `
        <h2 style="color: #475569; margin-bottom: 16px;">Application Update</h2>
        <p style="color: #475569;">Dear ${application.applicant_name},</p>
        <p style="color: #475569;">Thank you for your interest in <strong>${formTitle}</strong>. After careful review, we are unable to offer you admission at this time.</p>
        ${notes ? `<p style="color: #475569; background: #f8fafc; padding: 12px 16px; border-radius: 6px; border-left: 3px solid #94a3b8;">${notes}</p>` : ''}
        <p style="color: #475569;">We wish you the best in your future endeavours.</p>
      `;
    } else {
      subject = `Application Update — ${formTitle}`;
      content = `
        <h2 style="color: #d97706; margin-bottom: 16px;">Application Waitlisted</h2>
        <p style="color: #475569;">Dear ${application.applicant_name},</p>
        <p style="color: #475569;">Your application for <strong>${formTitle}</strong> has been placed on the waitlist. We will contact you if a spot becomes available.</p>
        <p style="margin: 20px 0;"><a href="${statusUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Check Status</a></p>
      `;
    }

    await sendEmail({
      to: application.applicant_email,
      subject,
      html: wrapEmailTemplate(content, { title: subject }),
    });
  } catch (emailError) {
    console.error('Failed to send review email:', emailError);
  }

  return { success: true, application: updated };
}

/**
 * Request changes on an application. Sends feedback to applicant.
 */
export async function requestChanges(
  appId: string,
  reviewerId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceSupabaseClient();

  const { data: application } = await supabase
    .from('admission_applications')
    .select('*')
    .eq('id', appId)
    .single();

  if (!application) {
    return { success: false, error: 'Application not found' };
  }

  const oldStatus = application.status;

  const { error: updateError } = await supabase
    .from('admission_applications')
    .update({
      status: 'changes_requested',
      change_request_message: message,
      reviewer_id: reviewerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appId);

  if (updateError) {
    return { success: false, error: 'Failed to update application' };
  }

  // Audit trail
  await supabase.from('admission_reviews').insert({
    application_id: appId,
    reviewer_id: reviewerId,
    old_status: oldStatus,
    new_status: 'changes_requested',
    notes: message,
  });

  // Email applicant
  try {
    const { data: form } = await supabase
      .from('admission_forms')
      .select('title')
      .eq('id', application.form_id)
      .single();

    const formTitle = form?.title || 'Application';
    const statusUrl = `${getBaseUrl()}/admissions/status?token=${application.access_token}`;

    const emailContent = `
      <h2 style="color: #d97706; margin-bottom: 16px;">Action Required</h2>
      <p style="color: #475569;">Dear ${application.applicant_name},</p>
      <p style="color: #475569;">We have reviewed your application for <strong>${formTitle}</strong> and require some changes before we can proceed.</p>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <strong style="color: #92400e; display: block; margin-bottom: 8px;">Reviewer Feedback</strong>
        <p style="color: #78350f; margin: 0;">${message}</p>
      </div>
      <p style="color: #475569;">Please visit your application status page to review the feedback and resubmit your application.</p>
      <p style="margin: 20px 0;"><a href="${statusUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Review & Resubmit</a></p>
    `;

    await sendEmail({
      to: application.applicant_email,
      subject: `Action Required — ${formTitle}`,
      html: wrapEmailTemplate(emailContent, { title: 'Action Required' }),
    });
  } catch (emailError) {
    console.error('Failed to send change request email:', emailError);
  }

  return { success: true };
}

/**
 * Resubmit application after changes requested. Only when status is changes_requested.
 */
export async function resubmitApplication(
  accessToken: string,
  answers: Array<{ field_id: string; answer: unknown }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceSupabaseClient();

  const { data: application } = await supabase
    .from('admission_applications')
    .select('*')
    .eq('access_token', accessToken)
    .single();

  if (!application) {
    return { success: false, error: 'Application not found' };
  }

  if (application.status !== 'changes_requested') {
    return { success: false, error: 'Application is not in a state that allows resubmission' };
  }

  const { error: updateError } = await supabase
    .from('admission_applications')
    .update({
      answers,
      status: 'resubmitted',
      change_request_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', application.id);

  if (updateError) {
    return { success: false, error: 'Failed to resubmit application' };
  }

  // Audit trail
  await supabase.from('admission_reviews').insert({
    application_id: application.id,
    reviewer_id: application.reviewer_id || application.form_id,
    old_status: 'changes_requested',
    new_status: 'resubmitted',
    notes: 'Application resubmitted by applicant',
  });

  // Email confirmation
  try {
    const { data: form } = await supabase
      .from('admission_forms')
      .select('title')
      .eq('id', application.form_id)
      .single();

    const formTitle = form?.title || 'Application';
    const statusUrl = `${getBaseUrl()}/admissions/status?token=${application.access_token}`;

    const emailContent = `
      <h2 style="color: #16a34a; margin-bottom: 16px;">Resubmission Received</h2>
      <p style="color: #475569;">Dear ${application.applicant_name},</p>
      <p style="color: #475569;">Your updated application for <strong>${formTitle}</strong> has been received and will be reviewed shortly.</p>
      <p style="margin: 20px 0;"><a href="${statusUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Check Status</a></p>
    `;

    await sendEmail({
      to: application.applicant_email,
      subject: `Resubmission Received — ${formTitle}`,
      html: wrapEmailTemplate(emailContent, { title: 'Resubmission Received' }),
    });
  } catch (emailError) {
    console.error('Failed to send resubmission email:', emailError);
  }

  return { success: true };
}

/**
 * Approve application and auto-provision user account + enrollment.
 */
export async function approveAndProvision(
  appId: string,
  reviewerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceSupabaseClient();

  const { data: application } = await supabase
    .from('admission_applications')
    .select('*')
    .eq('id', appId)
    .single();

  if (!application) {
    return { success: false, error: 'Application not found' };
  }

  if (application.status === 'approved') {
    return { success: false, error: 'Application is already approved' };
  }

  const oldStatus = application.status;

  // Get form + programme info
  const { data: form } = await supabase
    .from('admission_forms')
    .select('title, programme_id')
    .eq('id', application.form_id)
    .single();

  const formTitle = form?.title || 'Application';
  let programmeName = '';

  // 1. Check if user email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', application.applicant_email.toLowerCase())
    .single();

  let userId: string;
  let tempPassword: string | null = null;
  let isNewUser = false;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create new user
    isNewUser = true;
    tempPassword = generateTempPassword();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: application.applicant_email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: application.applicant_name,
        role: 'student',
      },
    });

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError);
      return { success: false, error: 'Failed to create user account' };
    }

    userId = authData.user.id;

    // Insert into users table
    await supabase.from('users').insert({
      id: userId,
      email: application.applicant_email.toLowerCase(),
      name: application.applicant_name,
      role: 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Insert user profile
    await supabase.from('user_profiles').insert({
      user_id: userId,
      bio: '',
      avatar: null,
      learning_preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // 2. Enroll in programme if form has one
  let enrollmentId: string | null = null;
  if (form?.programme_id) {
    const { data: programme } = await supabase
      .from('programmes')
      .select('id, title')
      .eq('id', form.programme_id)
      .single();

    if (programme) {
      programmeName = programme.title;

      // Check existing enrollment
      const { data: existingEnrollment } = await supabase
        .from('programme_enrollments')
        .select('id')
        .eq('programme_id', programme.id)
        .eq('student_id', userId)
        .single();

      if (existingEnrollment) {
        enrollmentId = existingEnrollment.id;
      } else {
        const { data: enrollment } = await supabase
          .from('programme_enrollments')
          .insert({
            programme_id: programme.id,
            student_id: userId,
            status: 'active',
          })
          .select('id')
          .single();

        enrollmentId = enrollment?.id || null;
      }
    }
  }

  // 3. Update application
  const { error: updateError } = await supabase
    .from('admission_applications')
    .update({
      status: 'approved',
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      user_id: userId,
      enrollment_id: enrollmentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appId);

  if (updateError) {
    return { success: false, error: 'Failed to update application' };
  }

  // 4. Audit trail
  await supabase.from('admission_reviews').insert({
    application_id: appId,
    reviewer_id: reviewerId,
    old_status: oldStatus,
    new_status: 'approved',
    notes: notes || 'Application approved, user provisioned',
  });

  // 5. Send welcome email
  try {
    const loginUrl = `${getBaseUrl()}/auth/signin`;
    let credentialsBlock = '';

    if (isNewUser && tempPassword) {
      credentialsBlock = `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <strong style="color: #166534; display: block; margin-bottom: 12px;">Your Login Credentials</strong>
          <p style="color: #14532d; margin: 4px 0;"><strong>Email:</strong> ${application.applicant_email}</p>
          <p style="color: #14532d; margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background: white; padding: 2px 8px; border-radius: 3px;">${tempPassword}</code></p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 12px;">Please change your password after your first login.</p>
        </div>
      `;
    } else {
      credentialsBlock = `
        <p style="color: #475569;">You can log in using your existing account credentials.</p>
      `;
    }

    const emailContent = `
      <h2 style="color: #16a34a; margin-bottom: 16px;">Congratulations!</h2>
      <p style="color: #475569;">Dear ${application.applicant_name},</p>
      <p style="color: #475569;">We are pleased to inform you that your application for <strong>${formTitle}</strong> has been approved!</p>
      ${programmeName ? `<p style="color: #475569;">You have been enrolled in: <strong>${programmeName}</strong></p>` : ''}
      ${notes ? `<div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; border-left: 3px solid #2563eb; margin: 16px 0;"><p style="color: #475569; margin: 0;">${notes}</p></div>` : ''}
      ${credentialsBlock}
      <p style="margin: 20px 0;"><a href="${loginUrl}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Log In to Your Account</a></p>
    `;

    await sendEmail({
      to: application.applicant_email,
      subject: `Congratulations! Accepted — ${formTitle}`,
      html: wrapEmailTemplate(emailContent, { title: 'Application Approved' }),
    });
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError);
  }

  return { success: true };
}

/**
 * Bulk review applications. Dispatches to reviewApplication or approveAndProvision.
 */
export async function bulkReview(
  ids: string[],
  decision: 'approved' | 'rejected' | 'waitlisted' | 'under_review',
  reviewerId: string,
  notes?: string
): Promise<{ processed: number; failed: number; results: Array<{ id: string; success: boolean; error?: string }> }> {
  let processed = 0;
  let failed = 0;
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const id of ids) {
    try {
      let result: { success: boolean; error?: string };

      if (decision === 'approved') {
        result = await approveAndProvision(id, reviewerId, notes);
      } else {
        result = await reviewApplication(id, decision, reviewerId, notes);
      }

      if (result.success) {
        processed++;
        results.push({ id, success: true });
      } else {
        failed++;
        results.push({ id, success: false, error: result.error });
      }
    } catch (error: unknown) {
      failed++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({ id, success: false, error: message });
    }
  }

  return { processed, failed, results };
}
