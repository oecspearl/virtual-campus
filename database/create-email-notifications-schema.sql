-- Email Notifications System Schema
-- Creates tables for email notifications, templates, and user preferences

-- Email notifications log
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'grade_posted', 'assignment_due', 'course_announcement', etc.
  subject VARCHAR(255) NOT NULL,
  body_text TEXT,
  body_html TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (course_id, assignment_id, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_user ON email_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(type, created_at DESC);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- Template type matching notification types
  subject_template TEXT NOT NULL,
  body_html_template TEXT NOT NULL,
  body_text_template TEXT,
  variables JSONB DEFAULT '[]'::jsonb, -- Available template variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{
    "assignment_due_reminder": {"email": true, "in_app": true, "days_before": 1},
    "grade_posted": {"email": true, "in_app": true},
    "course_announcement": {"email": true, "in_app": true},
    "discussion_reply": {"email": true, "in_app": true},
    "discussion_mention": {"email": true, "in_app": true},
    "enrollment_confirmation": {"email": true, "in_app": true},
    "course_enrollment": {"email": true, "in_app": true}
  }'::jsonb,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (digest_frequency IN ('none', 'daily', 'weekly')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Email digest queue (for scheduled sends)
CREATE TABLE IF NOT EXISTS email_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_type VARCHAR(20) NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  notification_ids UUID[] DEFAULT '{}', -- Array of email_notification IDs
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_digests_user ON email_digests(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_digests_status ON email_digests(status, scheduled_for);

-- Enable Row Level Security
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_notifications
DROP POLICY IF EXISTS "Users can view their own email notifications" ON email_notifications;
CREATE POLICY "Users can view their own email notifications"
  ON email_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all email notifications" ON email_notifications;
CREATE POLICY "Admins can view all email notifications"
  ON email_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for email_templates
DROP POLICY IF EXISTS "Authenticated users can view active templates" ON email_templates;
CREATE POLICY "Authenticated users can view active templates"
  ON email_templates FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;
CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for notification_preferences
DROP POLICY IF EXISTS "Users can manage their own preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for email_digests
DROP POLICY IF EXISTS "Users can view their own digests" ON email_digests;
CREATE POLICY "Users can view their own digests"
  ON email_digests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all digests" ON email_digests;
CREATE POLICY "Admins can view all digests"
  ON email_digests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Insert default email templates
INSERT INTO email_templates (name, type, subject_template, body_html_template, body_text_template, variables) VALUES
('Grade Posted', 'grade_posted', 'Your grade for {{assignment_name}} is available', 
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Grade Posted</h2>
    <p>Hello {{student_name}},</p>
    <p>Your grade for <strong>{{assignment_name}}</strong> in the course <strong>{{course_title}}</strong> has been posted.</p>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Score:</strong> {{score}} / {{total_points}} ({{percentage}}%)</p>
      {{#if feedback}}<p><strong>Feedback:</strong> {{feedback}}</p>{{/if}}
    </div>
    <p><a href="{{course_url}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View in LMS</a></p>
    <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">This is an automated notification from OECS LearnBoard.</p>
  </div>
</body></html>',
'Grade Posted\n\nHello {{student_name}},\n\nYour grade for {{assignment_name}} in the course {{course_title}} has been posted.\n\nScore: {{score}} / {{total_points}} ({{percentage}}%)\n\nView in LMS: {{course_url}}',
'["student_name", "assignment_name", "course_title", "score", "total_points", "percentage", "feedback", "course_url"]'::jsonb),

('Assignment Due Reminder', 'assignment_due_reminder', 'Reminder: {{assignment_name}} due {{due_date}}',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626;">Assignment Due Reminder</h2>
    <p>Hello {{student_name}},</p>
    <p>This is a reminder that <strong>{{assignment_name}}</strong> in the course <strong>{{course_title}}</strong> is due <strong>{{due_date}}</strong>.</p>
    {{#if time_remaining}}<p><strong>Time remaining:</strong> {{time_remaining}}</p>{{/if}}
    <p><a href="{{assignment_url}}" style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Assignment</a></p>
    <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">This is an automated reminder from OECS LearnBoard.</p>
  </div>
</body></html>',
'Assignment Due Reminder\n\nHello {{student_name}},\n\nThis is a reminder that {{assignment_name}} in the course {{course_title}} is due {{due_date}}.\n\nView Assignment: {{assignment_url}}',
'["student_name", "assignment_name", "course_title", "due_date", "time_remaining", "assignment_url"]'::jsonb),

('Course Announcement', 'course_announcement', 'New announcement: {{course_title}}',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Course Announcement</h2>
    <p>Hello {{student_name}},</p>
    <p>A new announcement has been posted in <strong>{{course_title}}</strong>:</p>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">{{announcement_title}}</h3>
      <div>{{announcement_content}}</div>
    </div>
    <p><a href="{{course_url}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Course</a></p>
    <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">This is an automated notification from OECS LearnBoard.</p>
  </div>
</body></html>',
'Course Announcement\n\nHello {{student_name}},\n\nA new announcement has been posted in {{course_title}}:\n\n{{announcement_title}}\n\n{{announcement_content}}\n\nView Course: {{course_url}}',
'["student_name", "course_title", "announcement_title", "announcement_content", "course_url"]'::jsonb),

('Discussion Reply', 'discussion_reply', 'New reply to your discussion: {{discussion_title}}',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">New Discussion Reply</h2>
    <p>Hello {{user_name}},</p>
    <p><strong>{{reply_author_name}}</strong> replied to your discussion "<strong>{{discussion_title}}</strong>" in <strong>{{course_title}}</strong>:</p>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <div>{{reply_content}}</div>
    </div>
    <p><a href="{{discussion_url}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Discussion</a></p>
    <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">This is an automated notification from OECS LearnBoard.</p>
  </div>
</body></html>',
'New Discussion Reply\n\nHello {{user_name}},\n\n{{reply_author_name}} replied to your discussion "{{discussion_title}}" in {{course_title}}:\n\n{{reply_content}}\n\nView Discussion: {{discussion_url}}',
'["user_name", "reply_author_name", "discussion_title", "course_title", "reply_content", "discussion_url"]'::jsonb),

('Enrollment Confirmation', 'enrollment_confirmation', 'Welcome to {{course_title}}',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #16a34a;">Welcome to {{course_title}}</h2>
    <p>Hello {{student_name}},</p>
    <p>You have been successfully enrolled in <strong>{{course_title}}</strong>!</p>
    <p>You can now access course materials, lessons, assignments, and participate in discussions.</p>
    <p><a href="{{course_url}}" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Learning</a></p>
    <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">This is an automated notification from OECS LearnBoard.</p>
  </div>
</body></html>',
'Welcome to {{course_title}}\n\nHello {{student_name}},\n\nYou have been successfully enrolled in {{course_title}}!\n\nStart Learning: {{course_url}}',
'["student_name", "course_title", "course_url"]'::jsonb),

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
      
      <!-- Available Tools Section -->
      <div style="margin: 30px 0;">
        <h3 style="color: #1f2937; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🛠️ Tools at Your Disposal</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">📚 My Courses</div>
            <div style="font-size: 14px; color: #6b7280;">Access all your enrolled courses and track progress</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">📝 Assignments</div>
            <div style="font-size: 14px; color: #6b7280;">View and submit assignments on time</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">✅ Quizzes</div>
            <div style="font-size: 14px; color: #6b7280;">Take quizzes to test your knowledge</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">💬 Discussions</div>
            <div style="font-size: 14px; color: #6b7280;">Engage with peers and instructors</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">🤖 AI Tutor</div>
            <div style="font-size: 14px; color: #6b7280;">Get personalized help with lessons</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">📊 Progress Tracking</div>
            <div style="font-size: 14px; color: #6b7280;">Monitor your learning progress and grades</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">🏆 Certificates</div>
            <div style="font-size: 14px; color: #6b7280;">Earn certificates upon course completion</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">🎮 Gamification</div>
            <div style="font-size: 14px; color: #6b7280;">Earn XP, level up, and maintain streaks</div>
          </div>
        </div>
      </div>
      
      <!-- Navigation Tips Section -->
      <div style="margin: 30px 0;">
        <h3 style="color: #1f2937; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">💡 Tips for Better Navigation & Learning</h3>
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 15px 0; border-radius: 4px;">
          <p style="margin: 0; color: #166534; font-weight: bold; font-size: 15px;">📱 Navigation Tips:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #374151;">
            <li style="margin: 8px 0;">Use the <strong>Dashboard</strong> as your home base - it shows your progress, upcoming deadlines, and quick access to all tools</li>
            <li style="margin: 8px 0;">The <strong>My Courses</strong> page gives you an overview of all enrolled courses and their progress</li>
            <li style="margin: 8px 0;">Check the <strong>Assignments</strong> page regularly to stay on top of due dates</li>
            <li style="margin: 8px 0;">Use the search function in the navigation bar to quickly find courses, lessons, or content</li>
            <li style="margin: 8px 0;">Access your <strong>Profile</strong> to update preferences, view certificates, and manage notifications</li>
          </ul>
        </div>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-weight: bold; font-size: 15px;">🎓 Learning Tips:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #374151;">
            <li style="margin: 8px 0;">Set aside dedicated time each day for learning - consistency is key!</li>
            <li style="margin: 8px 0;">Use the <strong>AI Tutor</strong> when you need help understanding concepts - it provides context-aware assistance</li>
            <li style="margin: 8px 0;">Participate in <strong>Discussions</strong> to engage with peers and deepen your understanding</li>
            <li style="margin: 8px 0;">Track your progress regularly - celebrate milestones and identify areas for improvement</li>
            <li style="margin: 8px 0;">Complete lessons in order to build knowledge progressively</li>
            <li style="margin: 8px 0;">Review quiz results and assignment feedback to learn from mistakes</li>
            <li style="margin: 8px 0;">Maintain your daily login streak to earn bonus XP and stay motivated</li>
            <li style="margin: 8px 0;">Customize your learning preferences in your profile for a personalized experience</li>
          </ul>
        </div>
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1e40af; font-weight: bold; font-size: 15px;">⚡ Quick Actions:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #374151;">
            <li style="margin: 8px 0;">Bookmark the platform URL for quick access</li>
            <li style="margin: 8px 0;">Enable browser notifications to stay updated on deadlines and announcements</li>
            <li style="margin: 8px 0;">Use the Help Center (accessible from the navigation menu) for detailed guides and support</li>
            <li style="margin: 8px 0;">Check your email regularly for important course announcements and grade notifications</li>
          </ul>
        </div>
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
'Welcome to OECS LearnBoard - Your Learning Journey Begins!\n\nHello {{student_name}},\n\nWe are excited to welcome you to OECS LearnBoard! Your account has been created and you are ready to begin your learning journey.\n\nYOUR LOGIN CREDENTIALS:\nEmail: {{student_email}}\nPassword: {{temporary_password}}\n\n⚠️ Important: This is a temporary password. Please change it immediately after your first login for security.\n\nPLATFORM ACCESS:\nVisit: {{platform_url}}\nSign In: {{login_url}}\n\nGETTING STARTED:\n1. Sign In: Use your credentials above to log in to the platform\n2. Change Your Password: Navigate to your profile and update your password for security\n3. Complete Your Profile: Add your learning preferences to personalize your experience\n4. Explore Your Dashboard: Check out your enrolled courses and upcoming assignments\n5. Start Learning: Begin with your first course and lesson!\n\nTOOLS AT YOUR DISPOSAL:\n- My Courses: Access all your enrolled courses and track progress\n- Assignments: View and submit assignments on time\n- Quizzes: Take quizzes to test your knowledge\n- Discussions: Engage with peers and instructors\n- AI Tutor: Get personalized help with lessons\n- Progress Tracking: Monitor your learning progress and grades\n- Certificates: Earn certificates upon course completion\n- Gamification: Earn XP, level up, and maintain streaks\n\nNAVIGATION TIPS:\n- Use the Dashboard as your home base\n- Check My Courses for an overview of all enrolled courses\n- Visit Assignments page regularly to stay on top of due dates\n- Use the search function to quickly find content\n- Access your Profile to update preferences and view certificates\n\nLEARNING TIPS:\n- Set aside dedicated time each day for learning\n- Use the AI Tutor when you need help understanding concepts\n- Participate in Discussions to engage with peers\n- Track your progress regularly\n- Complete lessons in order to build knowledge progressively\n- Review quiz results and assignment feedback\n- Maintain your daily login streak to earn bonus XP\n- Customize your learning preferences in your profile\n\nQUICK ACTIONS:\n- Bookmark the platform URL for quick access\n- Enable browser notifications to stay updated\n- Use the Help Center for detailed guides and support\n- Check your email regularly for important announcements\n\nNeed Help?\nVisit Help Center: {{help_url}}\nContact Support: support@oecslearning.org\n\nGet Started: {{login_url}}\n\nWe are thrilled to have you join our learning community. Your educational journey starts now!\n\nBest regards,\nThe OECS LearnBoard Team',
'["student_name", "student_email", "temporary_password", "platform_url", "login_url", "help_url"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_email_notifications_updated_at ON email_notifications;
CREATE TRIGGER update_email_notifications_updated_at
  BEFORE UPDATE ON email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE email_notifications IS 'Log of all email notifications sent';
COMMENT ON TABLE email_templates IS 'Reusable email templates for notifications';
COMMENT ON TABLE notification_preferences IS 'User preferences for email and in-app notifications';
COMMENT ON TABLE email_digests IS 'Scheduled email digests for daily/weekly summaries';
