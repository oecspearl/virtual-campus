-- Insert missing student_welcome email template
-- Run this if you're getting "Template not found for type: student_welcome" error

INSERT INTO email_templates (name, type, subject_template, body_html_template, body_text_template, variables) VALUES
('Student Welcome', 'student_welcome', 'Welcome to OECS LearnBoard - Your Learning Journey Begins!',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to OECS LearnBoard!</h1>
      <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your personalized learning platform</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; margin-top: 0;">Hello <strong>{{student_name}}</strong>,</p>
      <p>We are excited to welcome you to OECS LearnBoard! Your account has been created and you are ready to begin your learning journey.</p>
      
      <!-- Login Credentials Section -->
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
        <h3 style="color: #2563eb; margin-top: 0; font-size: 18px;">🔐 Your Login Credentials</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Email:</td>
            <td style="padding: 8px 0; color: #1f2937; font-family: monospace; font-size: 14px;">{{student_email}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Password:</td>
            <td style="padding: 8px 0; color: #1f2937; font-family: monospace; font-size: 14px;">{{temporary_password}}</td>
          </tr>
        </table>
        <p style="background: #fef3c7; border: 1px solid #fbbf24; padding: 12px; border-radius: 6px; margin: 15px 0 0 0; color: #92400e; font-size: 14px;">
          <strong>⚠️ Important:</strong> This is a temporary password. Please change it immediately after your first login for security.
        </p>
      </div>
      
      <!-- Platform Access Section -->
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">🌐 Access Your Platform</h3>
        <p style="margin: 10px 0;">Visit the platform at:</p>
        <p style="margin: 15px 0;">
          <a href="{{platform_url}}" style="color: #2563eb; font-weight: bold; font-size: 16px; text-decoration: none; word-break: break-all;">{{platform_url}}</a>
        </p>
        <p style="margin: 15px 0 0 0;">
          <a href="{{login_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Sign In Now</a>
        </p>
      </div>
      
      <!-- Getting Started Section -->
      <div style="margin: 30px 0;">
        <h3 style="color: #1f2937; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🚀 Getting Started</h3>
        <ol style="padding-left: 20px; color: #374151;">
          <li style="margin: 12px 0;"><strong>Sign In:</strong> Use your credentials above to log in to the platform</li>
          <li style="margin: 12px 0;"><strong>Change Your Password:</strong> Navigate to your profile and update your password for security</li>
          <li style="margin: 12px 0;"><strong>Complete Your Profile:</strong> Add your learning preferences to personalize your experience</li>
          <li style="margin: 12px 0;"><strong>Explore Your Dashboard:</strong> Check out your enrolled courses and upcoming assignments</li>
          <li style="margin: 12px 0;"><strong>Start Learning:</strong> Begin with your first course and lesson!</li>
        </ol>
      </div>
      
      <!-- Support Section -->
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">❓ Need Help?</h3>
        <p style="color: #6b7280; margin: 10px 0;">If you have any questions or need assistance, please don''t hesitate to reach out:</p>
        <p style="margin: 15px 0;">
          <a href="{{help_url}}" style="color: #2563eb; text-decoration: none; font-weight: bold;">Visit Help Center</a> | 
          <a href="mailto:support@oecslearning.org" style="color: #2563eb; text-decoration: none; font-weight: bold;">Contact Support</a>
        </p>
      </div>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{login_url}}" style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">Get Started Now</a>
      </div>
      
      <p style="margin-top: 30px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        We are thrilled to have you join our learning community. Your educational journey starts now!
      </p>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
        Best regards,<br>
        <strong>The OECS LearnBoard Team</strong>
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0;">This is an automated email from OECS LearnBoard</p>
      <p style="margin: 5px 0 0 0;">
        <a href="{{platform_url}}" style="color: #2563eb; text-decoration: none;">Visit OECS LearnBoard</a>
      </p>
    </div>
  </div>
</body></html>',
'Welcome to OECS LearnBoard - Your Learning Journey Begins!

Hello {{student_name}},

We are excited to welcome you to OECS LearnBoard! Your account has been created and you are ready to begin your learning journey.

YOUR LOGIN CREDENTIALS:
Email: {{student_email}}
Password: {{temporary_password}}

⚠️ Important: This is a temporary password. Please change it immediately after your first login for security.

PLATFORM ACCESS:
Visit: {{platform_url}}
Sign In: {{login_url}}

GETTING STARTED:
1. Sign In: Use your credentials above to log in to the platform
2. Change Your Password: Navigate to your profile and update your password for security
3. Complete Your Profile: Add your learning preferences to personalize your experience
4. Explore Your Dashboard: Check out your enrolled courses and upcoming assignments
5. Start Learning: Begin with your first course and lesson!

Need Help?
Visit Help Center: {{help_url}}
Contact Support: support@oecslearning.org

Get Started: {{login_url}}

We are thrilled to have you join our learning community. Your educational journey starts now!

Best regards,
The OECS LearnBoard Team',
'["student_name", "student_email", "temporary_password", "platform_url", "login_url", "help_url"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  subject_template = EXCLUDED.subject_template,
  body_html_template = EXCLUDED.body_html_template,
  body_text_template = EXCLUDED.body_text_template,
  variables = EXCLUDED.variables,
  is_active = true,
  updated_at = NOW();
