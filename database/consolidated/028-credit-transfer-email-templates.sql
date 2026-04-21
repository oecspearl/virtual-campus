-- ============================================================================
-- Part 28: Email templates for credit-transfer status changes
-- ============================================================================
-- Depends on: 006 (email_templates), 027 (credit_records)
-- ============================================================================
-- Seeds three templates used by sendNotification() when a registrar transitions
-- a credit_record through start_review / approve / reject. Idempotent via
-- ON CONFLICT on the UNIQUE name column.
-- ============================================================================

INSERT INTO public.email_templates (name, type, subject_template, body_html_template, body_text_template, variables, is_active)
VALUES
  (
    'Credit transfer — under review',
    'credit_record_under_review',
    'Your credit transfer for {{course_title}} is under review',
    '<p>Hi {{student_name}},</p>
<p>Your credit submission for <strong>{{course_title}}</strong> from {{issuing_institution_name}} is now under review by the registrar at {{reviewing_institution_name}}.</p>
<p>You''ll receive another email when a decision has been made.</p>
<p><a href="{{record_url}}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View submission</a></p>',
    'Hi {{student_name}},

Your credit submission for {{course_title}} from {{issuing_institution_name}} is now under review by the registrar at {{reviewing_institution_name}}.

You''ll receive another email when a decision has been made.

View submission: {{record_url}}',
    '["student_name","course_title","issuing_institution_name","reviewing_institution_name","record_url"]'::jsonb,
    true
  ),
  (
    'Credit transfer — approved',
    'credit_record_approved',
    'Your credit transfer for {{course_title}} has been approved',
    '<p>Hi {{student_name}},</p>
<p>Good news — your credit submission for <strong>{{course_title}}</strong> from {{issuing_institution_name}} has been approved.</p>
<p><strong>{{awarded_credits}}</strong> credit(s) have been added to your transcript at {{reviewing_institution_name}}.</p>
{{equivalence_block}}
<p><a href="{{record_url}}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View transcript</a></p>',
    'Hi {{student_name}},

Good news — your credit submission for {{course_title}} from {{issuing_institution_name}} has been approved.

{{awarded_credits}} credit(s) have been added to your transcript at {{reviewing_institution_name}}.

View transcript: {{record_url}}',
    '["student_name","course_title","issuing_institution_name","reviewing_institution_name","awarded_credits","equivalence_block","record_url"]'::jsonb,
    true
  ),
  (
    'Credit transfer — rejected',
    'credit_record_rejected',
    'Your credit transfer for {{course_title}} was not approved',
    '<p>Hi {{student_name}},</p>
<p>Your credit submission for <strong>{{course_title}}</strong> from {{issuing_institution_name}} was not approved by {{reviewing_institution_name}}.</p>
<p><strong>Reason:</strong> {{review_notes}}</p>
<p>You may submit a new request with additional evidence if appropriate.</p>
<p><a href="{{record_url}}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View submission</a></p>',
    'Hi {{student_name}},

Your credit submission for {{course_title}} from {{issuing_institution_name}} was not approved by {{reviewing_institution_name}}.

Reason: {{review_notes}}

You may submit a new request with additional evidence if appropriate.

View submission: {{record_url}}',
    '["student_name","course_title","issuing_institution_name","reviewing_institution_name","review_notes","record_url"]'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;
