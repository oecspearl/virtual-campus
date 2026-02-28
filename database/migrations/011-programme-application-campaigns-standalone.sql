-- ============================================================================
-- Migration 011: Programme Application Campaigns (Standalone)
-- ============================================================================
-- Creates programmes-related tables if they don't exist, then adds
-- application workflow tables. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Ensure prerequisite tables exist
-- ---------------------------------------------------------------------------

-- Programmes table (from 017, but without optional FKs to missing tables)
CREATE TABLE IF NOT EXISTS programmes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    thumbnail VARCHAR(500),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration VARCHAR(100),
    passing_score DECIMAL(5,2) DEFAULT 70.00,
    published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Programme courses (from 017)
CREATE TABLE IF NOT EXISTS programme_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0,
    weight DECIMAL(5,2) DEFAULT 1.00,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(programme_id, course_id)
);

-- Programme enrollments (from 017, without certificate FK)
CREATE TABLE IF NOT EXISTS programme_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
    final_score DECIMAL(5,2),
    certificate_issued BOOLEAN DEFAULT false,
    UNIQUE(programme_id, student_id)
);

-- Add updated_at to programme_enrollments if missing
ALTER TABLE programme_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indexes for programme tables
CREATE INDEX IF NOT EXISTS idx_programmes_slug ON programmes(slug);
CREATE INDEX IF NOT EXISTS idx_programmes_published ON programmes(published);
CREATE INDEX IF NOT EXISTS idx_programme_courses_programme ON programme_courses(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_courses_course ON programme_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_programme ON programme_enrollments(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_student ON programme_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_status ON programme_enrollments(status);

-- RLS for programme tables
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_enrollments ENABLE ROW LEVEL SECURITY;

-- Programme RLS policies (safe to re-create)
DROP POLICY IF EXISTS "Published programmes are viewable by everyone" ON programmes;
CREATE POLICY "Published programmes are viewable by everyone" ON programmes
    FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Staff can view all programmes" ON programmes;
CREATE POLICY "Staff can view all programmes" ON programmes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Staff can manage programmes" ON programmes;
CREATE POLICY "Staff can manage programmes" ON programmes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
    );

DROP POLICY IF EXISTS "Programme courses viewable with programme" ON programme_courses;
CREATE POLICY "Programme courses viewable with programme" ON programme_courses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM programmes WHERE programmes.id = programme_courses.programme_id AND programmes.published = true)
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                   AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Staff can manage programme courses" ON programme_courses;
CREATE POLICY "Staff can manage programme courses" ON programme_courses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
    );

DROP POLICY IF EXISTS "Students can view own enrollments" ON programme_enrollments;
CREATE POLICY "Students can view own enrollments" ON programme_enrollments
    FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all enrollments" ON programme_enrollments;
CREATE POLICY "Staff can view all enrollments" ON programme_enrollments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Students can enroll themselves" ON programme_enrollments;
CREATE POLICY "Students can enroll themselves" ON programme_enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage enrollments" ON programme_enrollments;
CREATE POLICY "Staff can manage enrollments" ON programme_enrollments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin'))
    );

-- Auto-enroll trigger: when student enrolls in programme, enroll in all courses
CREATE OR REPLACE FUNCTION auto_enroll_programme_courses()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO enrollments (student_id, course_id, status)
    SELECT NEW.student_id, pc.course_id, 'active'
    FROM programme_courses pc
    WHERE pc.programme_id = NEW.programme_id
    AND NOT EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.student_id = NEW.student_id AND e.course_id = pc.course_id
    )
    ON CONFLICT (student_id, course_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_enroll_programme_courses ON programme_enrollments;
CREATE TRIGGER trg_auto_enroll_programme_courses
    AFTER INSERT ON programme_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION auto_enroll_programme_courses();

-- Grants for programme tables
GRANT SELECT ON programmes TO authenticated;
GRANT SELECT ON programme_courses TO authenticated;
GRANT SELECT, INSERT ON programme_enrollments TO authenticated;
GRANT ALL ON programmes TO service_role;
GRANT ALL ON programme_courses TO service_role;
GRANT ALL ON programme_enrollments TO service_role;

-- ---------------------------------------------------------------------------
-- Step 2: Application campaign tables
-- ---------------------------------------------------------------------------

-- Application form fields (questions) per campaign
CREATE TABLE IF NOT EXISTS programme_application_fields (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'essay', 'multiple_choice', 'multiple_select', 'rating_scale')),
  question_text TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  required BOOLEAN DEFAULT true,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT programme_application_fields_pkey PRIMARY KEY (id),
  CONSTRAINT programme_application_fields_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES crm_campaigns(id) ON DELETE CASCADE
);

-- Submitted applications
CREATE TABLE IF NOT EXISTS programme_applications (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL,
  programme_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  applicant_email VARCHAR NOT NULL,
  applicant_name VARCHAR NOT NULL,
  answers JSONB DEFAULT '[]',
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'waitlisted', 'withdrawn')),
  reviewed_by UUID,
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enrollment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT programme_applications_pkey PRIMARY KEY (id),
  CONSTRAINT programme_applications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT programme_applications_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE,
  CONSTRAINT programme_applications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES crm_campaign_recipients(id) ON DELETE CASCADE,
  CONSTRAINT programme_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT programme_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT programme_applications_unique_recipient UNIQUE (campaign_id, recipient_id)
);

-- Application token on campaign recipients for public form links
ALTER TABLE crm_campaign_recipients
  ADD COLUMN IF NOT EXISTS application_token UUID DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_campaign_recipients_application_token
  ON crm_campaign_recipients(application_token);

-- ---------------------------------------------------------------------------
-- Indexes for application tables
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_programme_application_fields_campaign_id
  ON programme_application_fields(campaign_id);

CREATE INDEX IF NOT EXISTS idx_programme_applications_campaign_id
  ON programme_applications(campaign_id);

CREATE INDEX IF NOT EXISTS idx_programme_applications_programme_id
  ON programme_applications(programme_id);

CREATE INDEX IF NOT EXISTS idx_programme_applications_applicant_id
  ON programme_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_programme_applications_status
  ON programme_applications(status);

CREATE INDEX IF NOT EXISTS idx_programme_applications_recipient_id
  ON programme_applications(recipient_id);

-- ---------------------------------------------------------------------------
-- RLS for application tables
-- ---------------------------------------------------------------------------
ALTER TABLE programme_application_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_applications ENABLE ROW LEVEL SECURITY;

-- programme_application_fields policies
DROP POLICY IF EXISTS programme_application_fields_staff_all ON programme_application_fields;
CREATE POLICY programme_application_fields_staff_all ON programme_application_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS programme_application_fields_anon_select ON programme_application_fields;
CREATE POLICY programme_application_fields_anon_select ON programme_application_fields
  FOR SELECT USING (true);

-- programme_applications policies
DROP POLICY IF EXISTS programme_applications_staff_all ON programme_applications;
CREATE POLICY programme_applications_staff_all ON programme_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS programme_applications_student_select ON programme_applications;
CREATE POLICY programme_applications_student_select ON programme_applications
  FOR SELECT USING (applicant_id = auth.uid());

DROP POLICY IF EXISTS programme_applications_student_insert ON programme_applications;
CREATE POLICY programme_applications_student_insert ON programme_applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants for application tables
-- ---------------------------------------------------------------------------
GRANT SELECT ON programme_application_fields TO authenticated;
GRANT SELECT, INSERT ON programme_applications TO authenticated;
GRANT SELECT ON programme_application_fields TO anon;
GRANT ALL ON programme_application_fields TO service_role;
GRANT ALL ON programme_applications TO service_role;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE programmes IS 'Programmes group multiple courses with weighted grade aggregation';
COMMENT ON TABLE programme_application_fields IS 'Custom form fields/questions for programme application campaigns';
COMMENT ON TABLE programme_applications IS 'Submitted programme applications with answers, review status, and enrollment linkage';
COMMENT ON COLUMN crm_campaign_recipients.application_token IS 'Unique token for accessing the public application form';
