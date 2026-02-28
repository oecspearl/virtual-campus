-- ============================================================================
-- Migration 011: Programme Application Campaigns
-- ============================================================================
-- Adds support for programme application workflows via CRM campaigns.
-- Includes application form fields, submitted applications, and
-- the application_token column on campaign recipients for public form access.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: programme_application_fields
-- Stores the custom form fields (questions) for an application campaign.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Table: programme_applications
-- Stores submitted applications from prospective students.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Alter crm_campaign_recipients: add application_token for public form links
-- ---------------------------------------------------------------------------
ALTER TABLE crm_campaign_recipients
  ADD COLUMN IF NOT EXISTS application_token UUID DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_campaign_recipients_application_token
  ON crm_campaign_recipients(application_token);

-- ---------------------------------------------------------------------------
-- Indexes
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
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE programme_application_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_applications ENABLE ROW LEVEL SECURITY;

-- ---- programme_application_fields policies ----

-- Staff (instructor, admin, super_admin) can manage all fields
DROP POLICY IF EXISTS programme_application_fields_staff_all ON programme_application_fields;
CREATE POLICY programme_application_fields_staff_all ON programme_application_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'admin', 'super_admin')
    )
  );

-- Anonymous / public can SELECT fields (needed for the public application form)
DROP POLICY IF EXISTS programme_application_fields_anon_select ON programme_application_fields;
CREATE POLICY programme_application_fields_anon_select ON programme_application_fields
  FOR SELECT USING (true);

-- ---- programme_applications policies ----

-- Staff (instructor, admin, super_admin) can manage all applications
DROP POLICY IF EXISTS programme_applications_staff_all ON programme_applications;
CREATE POLICY programme_applications_staff_all ON programme_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'admin', 'super_admin')
    )
  );

-- Students can SELECT their own applications
DROP POLICY IF EXISTS programme_applications_student_select ON programme_applications;
CREATE POLICY programme_applications_student_select ON programme_applications
  FOR SELECT USING (applicant_id = auth.uid());

-- Students can INSERT their own applications
DROP POLICY IF EXISTS programme_applications_student_insert ON programme_applications;
CREATE POLICY programme_applications_student_insert ON programme_applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- Authenticated users
GRANT SELECT ON programme_application_fields TO authenticated;
GRANT SELECT, INSERT ON programme_applications TO authenticated;

-- Anonymous users (public application form access)
GRANT SELECT ON programme_application_fields TO anon;

-- Service role (full access for backend operations)
GRANT ALL ON programme_application_fields TO service_role;
GRANT ALL ON programme_applications TO service_role;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE programme_application_fields IS 'Custom form fields/questions for programme application campaigns';
COMMENT ON TABLE programme_applications IS 'Submitted programme applications with answers, review status, and enrollment linkage';
COMMENT ON COLUMN crm_campaign_recipients.application_token IS 'Unique token for accessing the public application form';
