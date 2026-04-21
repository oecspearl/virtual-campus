-- ============================================================================
-- Part 31: Email template for credit-transfer comment notifications
-- ============================================================================
-- Depends on: 006 (email_templates), 029 (credit_record_comments)
-- ============================================================================
-- Seed template fired when a registrar posts a comment on a student's credit
-- record. Student posts don't page registrars — they bubble up through the
-- queue comment-count badge. Idempotent via ON CONFLICT (name).
-- ============================================================================

INSERT INTO public.email_templates (name, type, subject_template, body_html_template, body_text_template, variables, is_active)
VALUES
  (
    'Credit transfer — new comment',
    'credit_record_comment',
    'A registrar left a note on your credit transfer for {{course_title}}',
    '<p>Hi {{student_name}},</p>
<p>A registrar at {{reviewing_institution_name}} has added a note to your credit submission for <strong>{{course_title}}</strong>:</p>
<blockquote style="border-left:3px solid #2563eb;padding:8px 12px;margin:12px 0;background:#f0f7ff;color:#1e3a8a;">{{comment_excerpt}}</blockquote>
<p><a href="{{record_url}}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reply to the registrar</a></p>',
    'Hi {{student_name}},

A registrar at {{reviewing_institution_name}} has added a note to your credit submission for {{course_title}}:

"{{comment_excerpt}}"

Reply here: {{record_url}}',
    '["student_name","course_title","reviewing_institution_name","comment_excerpt","record_url"]'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;
