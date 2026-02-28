-- ============================================================
-- 024: Standalone Admissions Module
-- Complete admissions workflow independent of CRM campaigns
-- ============================================================

-- ─── 1. ADMISSION FORMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS admission_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admission_forms_slug ON admission_forms(slug);
CREATE INDEX IF NOT EXISTS idx_admission_forms_status ON admission_forms(status);
CREATE INDEX IF NOT EXISTS idx_admission_forms_programme ON admission_forms(programme_id);

-- ─── 2. ADMISSION FORM FIELDS ───────────────────────────────
CREATE TABLE IF NOT EXISTS admission_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES admission_forms(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'text', 'essay', 'email', 'phone', 'date',
    'select', 'multiple_choice', 'multiple_select',
    'file_upload', 'rating_scale'
  )),
  label VARCHAR(255) NOT NULL,
  description TEXT,
  placeholder VARCHAR(255),
  "order" INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '{}'::jsonb,
  section VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admission_form_fields_form ON admission_form_fields(form_id);

-- ─── 3. ADMISSION APPLICATIONS ──────────────────────────────
CREATE TABLE IF NOT EXISTS admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES admission_forms(id) ON DELETE CASCADE,
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255) NOT NULL,
  applicant_phone VARCHAR(50),
  answers JSONB DEFAULT '[]'::jsonb,
  access_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'changes_requested',
    'resubmitted', 'approved', 'rejected', 'waitlisted', 'withdrawn'
  )),
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  change_request_message TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  enrollment_id UUID,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_id, applicant_email)
);

CREATE INDEX IF NOT EXISTS idx_admission_apps_form ON admission_applications(form_id);
CREATE INDEX IF NOT EXISTS idx_admission_apps_status ON admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_apps_token ON admission_applications(access_token);
CREATE INDEX IF NOT EXISTS idx_admission_apps_email ON admission_applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_admission_apps_submitted ON admission_applications(submitted_at DESC);

-- ─── 4. ADMISSION DOCUMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS admission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES admission_form_fields(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admission_docs_app ON admission_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_admission_docs_field ON admission_documents(field_id);

-- ─── 5. ADMISSION REVIEWS (Audit Trail) ─────────────────────
CREATE TABLE IF NOT EXISTS admission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admission_reviews_app ON admission_reviews(application_id);

-- ─── 6. ROW LEVEL SECURITY ──────────────────────────────────

ALTER TABLE admission_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_reviews ENABLE ROW LEVEL SECURITY;

-- Staff full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_forms_staff_all') THEN
    CREATE POLICY admission_forms_staff_all ON admission_forms FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_fields_staff_all') THEN
    CREATE POLICY admission_fields_staff_all ON admission_form_fields FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_apps_staff_all') THEN
    CREATE POLICY admission_apps_staff_all ON admission_applications FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_docs_staff_all') THEN
    CREATE POLICY admission_docs_staff_all ON admission_documents FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_reviews_staff_all') THEN
    CREATE POLICY admission_reviews_staff_all ON admission_reviews FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
      );
  END IF;
END $$;

-- Anon: read published forms and fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_forms_anon_select') THEN
    CREATE POLICY admission_forms_anon_select ON admission_forms FOR SELECT TO anon
      USING (status = 'published');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_fields_anon_select') THEN
    CREATE POLICY admission_fields_anon_select ON admission_form_fields FOR SELECT TO anon
      USING (
        EXISTS (SELECT 1 FROM admission_forms WHERE admission_forms.id = form_id AND admission_forms.status = 'published')
      );
  END IF;
END $$;

-- Anon: insert applications and documents
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_apps_anon_insert') THEN
    CREATE POLICY admission_apps_anon_insert ON admission_applications FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admission_docs_anon_insert') THEN
    CREATE POLICY admission_docs_anon_insert ON admission_documents FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Service role: full access (automatically has it, no policies needed)

-- ─── 7. GRANTS ───────────────────────────────────────────────

GRANT SELECT ON admission_forms TO anon;
GRANT SELECT ON admission_form_fields TO anon;
GRANT INSERT ON admission_applications TO anon;
GRANT INSERT ON admission_documents TO anon;

GRANT ALL ON admission_forms TO authenticated;
GRANT ALL ON admission_form_fields TO authenticated;
GRANT ALL ON admission_applications TO authenticated;
GRANT ALL ON admission_documents TO authenticated;
GRANT ALL ON admission_reviews TO authenticated;

GRANT ALL ON admission_forms TO service_role;
GRANT ALL ON admission_form_fields TO service_role;
GRANT ALL ON admission_applications TO service_role;
GRANT ALL ON admission_documents TO service_role;
GRANT ALL ON admission_reviews TO service_role;
