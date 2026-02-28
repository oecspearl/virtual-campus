-- Certificate & Digital Badges System Database Schema
-- Run this in Supabase SQL Editor

-- 1. Certificate Templates Table
CREATE TABLE IF NOT EXISTS certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_html TEXT NOT NULL,
    background_image_url TEXT,
    logo_url TEXT,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Available template variables
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
    verification_code VARCHAR(50) UNIQUE NOT NULL, -- URL-safe verification code
    issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ, -- Optional expiration
    pdf_url TEXT, -- URL to stored PDF
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional certificate data
    grade_percentage DECIMAL(5,2), -- Final grade if applicable
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(student_id, course_id) -- One certificate per student per course
);

-- 3. Badges Table (OpenBadges compliant)
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    criteria_url TEXT, -- URL to badge criteria
    issuer_name VARCHAR(255) NOT NULL DEFAULT 'OECS Learning Hub',
    issuer_url TEXT,
    issuer_email TEXT,
    badge_class_id VARCHAR(255), -- OpenBadges class identifier
    tags TEXT[], -- Array of tags
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. User Badges Table (Links users to earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    evidence_url TEXT, -- URL to evidence of earning badge
    badge_assertion JSONB, -- OpenBadges 2.0 assertion JSON-LD
    verification_url TEXT, -- Public URL for verification
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, badge_id, course_id) -- One badge per user per course
);

-- 5. Transcripts Table
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    pdf_url TEXT, -- URL to stored PDF
    course_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of completed courses with grades
    total_credits DECIMAL(5,2) DEFAULT 0,
    gpa DECIMAL(3,2), -- Grade Point Average if applicable
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. CEU/Credit Tracking Table
CREATE TABLE IF NOT EXISTS ceu_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    credits DECIMAL(5,2) NOT NULL,
    credit_type VARCHAR(50) NOT NULL DEFAULT 'CEU', -- CEU, CPE, CME, etc.
    issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(student_id, course_id, credit_type) -- One credit record per type per course
);

-- 7. Add CEU credits field to courses table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'courses' AND column_name = 'ceu_credits') THEN
        ALTER TABLE courses ADD COLUMN ceu_credits DECIMAL(5,2) DEFAULT 0;
        ALTER TABLE courses ADD COLUMN credit_type VARCHAR(50) DEFAULT 'CEU';
    END IF;
END $$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_student_id ON transcripts(student_id);
CREATE INDEX IF NOT EXISTS idx_ceu_credits_student_id ON ceu_credits(student_id);
CREATE INDEX IF NOT EXISTS idx_ceu_credits_course_id ON ceu_credits(course_id);

-- Enable Row Level Security
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceu_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certificate_templates
CREATE POLICY "Admins can manage templates" ON certificate_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

CREATE POLICY "Everyone can view active templates" ON certificate_templates
    FOR SELECT USING (true);

-- RLS Policies for certificates
CREATE POLICY "Students can view own certificates" ON certificates
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Instructors and admins can view all certificates" ON certificates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('instructor', 'admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Public verification (no auth required)
CREATE POLICY "Public can verify certificates" ON certificates
    FOR SELECT USING (true); -- Verification is public via verification_code

-- Only system can create certificates (via service role)
CREATE POLICY "Service role can manage certificates" ON certificates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for badges
CREATE POLICY "Everyone can view badges" ON badges
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage badges" ON badges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- RLS Policies for user_badges
CREATE POLICY "Users can view own badges" ON user_badges
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Everyone can view user badges" ON user_badges
    FOR SELECT USING (true); -- Public badges for verification

CREATE POLICY "Service role can manage user badges" ON user_badges
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for transcripts
CREATE POLICY "Students can view own transcripts" ON transcripts
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Instructors and admins can view all transcripts" ON transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('instructor', 'admin', 'super_admin', 'curriculum_designer')
        )
    );

CREATE POLICY "Service role can manage transcripts" ON transcripts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for ceu_credits
CREATE POLICY "Students can view own credits" ON ceu_credits
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Instructors and admins can view all credits" ON ceu_credits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('instructor', 'admin', 'super_admin', 'curriculum_designer')
        )
    );

CREATE POLICY "Service role can manage credits" ON ceu_credits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to generate unique verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    code VARCHAR(50);
    exists_check INTEGER;
BEGIN
    LOOP
        -- Generate a random code: 8 alphanumeric characters, uppercase
        code := UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT COUNT(*) INTO exists_check
        FROM certificates
        WHERE verification_code = code;
        
        -- If code doesn't exist, return it
        IF exists_check = 0 THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to check course completion and auto-issue certificate
CREATE OR REPLACE FUNCTION check_course_completion()
RETURNS TRIGGER AS $$
DECLARE
    course_lessons_count INTEGER;
    completed_lessons_count INTEGER;
    enrollment_status VARCHAR(20);
    final_grade DECIMAL(5,2);
BEGIN
    -- Only trigger on status update to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Check if certificate already exists
        IF NOT EXISTS (
            SELECT 1 FROM certificates 
            WHERE student_id = NEW.student_id 
            AND course_id = NEW.course_id
        ) THEN
            -- Count total lessons in course
            SELECT COUNT(*) INTO course_lessons_count
            FROM lessons
            WHERE course_id = NEW.course_id;
            
            -- Count completed lessons
            SELECT COUNT(*) INTO completed_lessons_count
            FROM lesson_progress
            WHERE student_id = NEW.student_id
            AND course_id = NEW.course_id
            AND status = 'completed';
            
            -- Calculate final grade if gradebook exists
            SELECT AVG(percentage) INTO final_grade
            FROM course_grades
            WHERE student_id = NEW.student_id
            AND course_id = NEW.course_id;
            
            -- Only issue if all lessons are completed (or no lessons exist)
            IF (course_lessons_count = 0 OR completed_lessons_count = course_lessons_count) THEN
                -- Certificate will be issued via API call from application
                -- This function just marks the enrollment as ready
                RAISE NOTICE 'Course completion detected for student %, course %. Certificate should be generated via API.', NEW.student_id, NEW.course_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on enrollments table
DROP TRIGGER IF EXISTS trigger_check_course_completion ON enrollments;
CREATE TRIGGER trigger_check_course_completion
    AFTER UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION check_course_completion();

-- Insert default certificate template
INSERT INTO certificate_templates (name, description, template_html, is_default, variables)
VALUES (
    'Default Certificate',
    'Standard certificate template with logo and signature',
    '<div style="text-align: center; padding: 60px; font-family: ''Times New Roman'', serif;">
        <div style="margin-bottom: 40px;">
            <img src="{{logo_url}}" alt="Logo" style="max-height: 80px;" />
        </div>
        <h1 style="font-size: 48px; margin-bottom: 20px; color: #1a1a1a;">Certificate of Completion</h1>
        <p style="font-size: 20px; margin-bottom: 40px; color: #666;">This is to certify that</p>
        <h2 style="font-size: 36px; margin-bottom: 40px; color: #1a1a1a; font-weight: bold;">{{student_name}}</h2>
        <p style="font-size: 18px; margin-bottom: 40px; color: #666;">
            has successfully completed the course
        </p>
        <h3 style="font-size: 28px; margin-bottom: 40px; color: #1a1a1a;">{{course_name}}</h3>
        {{#if grade_percentage}}
        <p style="font-size: 16px; margin-bottom: 40px; color: #666;">
            with a grade of {{grade_percentage}}%
        </p>
        {{/if}}
        <p style="font-size: 16px; margin-bottom: 60px; color: #666;">
            Issued on {{completion_date}}
        </p>
        <div style="margin-top: 80px;">
            <p style="font-size: 14px; color: #666;">Verification Code: {{verification_code}}</p>
        </div>
    </div>',
    true,
    '["student_name", "course_name", "completion_date", "grade_percentage", "verification_code", "logo_url"]'::jsonb
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE certificates IS 'Stores digital certificates issued to students upon course completion';
COMMENT ON TABLE certificate_templates IS 'Templates for certificate generation';
COMMENT ON TABLE badges IS 'OpenBadges compliant badge definitions';
COMMENT ON TABLE user_badges IS 'Links users to earned badges';
COMMENT ON TABLE transcripts IS 'Official transcripts with course completion records';
COMMENT ON TABLE ceu_credits IS 'Continuing Education Units and credit tracking';

