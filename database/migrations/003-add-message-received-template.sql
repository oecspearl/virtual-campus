-- Insert message_received email template
-- This template is used when users receive new messages

INSERT INTO email_templates (name, type, subject_template, body_html_template, body_text_template, variables) VALUES
('New Message Received', 'message_received', 'New message from {{sender_name}}',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0066CC 0%, #004499 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Message</h1>
    </div>

    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>{{recipient_name}}</strong>,</p>
      <p>You have received a new message from <strong>{{sender_name}}</strong>.</p>

      <!-- Message Preview Section -->
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0066CC;">
        <p style="margin: 0; color: #374151; font-style: italic;">"{{message_preview}}"</p>
      </div>

      <!-- Call to Action -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{messages_url}}" style="background: linear-gradient(135deg, #0066CC 0%, #004499 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 102, 204, 0.3);">View Message</a>
      </div>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        You can manage your notification preferences in your <a href="{{profile_url}}" style="color: #0066CC; text-decoration: none;">account settings</a>.
      </p>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
        Best regards,<br>
        <strong>OECS LearnBoard</strong>
      </p>
    </div>

    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0;">This is an automated notification from OECS LearnBoard</p>
    </div>
  </div>
</body></html>',
'New Message from {{sender_name}}

Hi {{recipient_name}},

You have received a new message from {{sender_name}}.

Message Preview:
"{{message_preview}}"

View the full conversation: {{messages_url}}

---
You can manage your notification preferences in your account settings.

Best regards,
OECS LearnBoard',
'["recipient_name", "sender_name", "message_preview", "messages_url", "profile_url", "room_name"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  subject_template = EXCLUDED.subject_template,
  body_html_template = EXCLUDED.body_html_template,
  body_text_template = EXCLUDED.body_text_template,
  variables = EXCLUDED.variables,
  is_active = true,
  updated_at = NOW();
