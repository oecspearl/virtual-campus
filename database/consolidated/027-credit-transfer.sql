-- ============================================================================
-- Part 27: Regional Credit Transfer
-- ============================================================================
-- Depends on: 001 (tenants, users), 002 (courses), 014 (cross_tenant_enrollments)
-- ============================================================================
-- Lets a student submit credits earned at another institution (in-network via
-- cross_tenant_enrollments, or off-network via attestation) for review by the
-- receiving tenant's registrar. The record is scoped to the RECEIVING tenant —
-- that institution's registrar owns the approval decision.
-- ============================================================================

CREATE TABLE public.credit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- tenant_id = the RECEIVING institution (where this record is reviewed)

  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source of the credit
  source_type VARCHAR(20) NOT NULL DEFAULT 'in_network'
    CHECK (source_type IN ('in_network', 'external')),
  -- in_network: credit earned from a tenant in this platform
  -- external: credit earned at an outside institution (attestation)

  issuing_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  -- Set for in_network; NULL for external

  issuing_institution_name VARCHAR(255) NOT NULL,
  -- Denormalised for history — survives tenant rename/delete

  source_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  source_enrollment_id UUID REFERENCES cross_tenant_enrollments(id) ON DELETE SET NULL,

  -- Credit details
  course_title VARCHAR(500) NOT NULL,
  course_code VARCHAR(50),
  credits NUMERIC(4,2) NOT NULL CHECK (credits >= 0),
  grade VARCHAR(10),
  grade_scale VARCHAR(50),
  completion_date DATE,

  -- Evidence
  evidence_url VARCHAR(1000),
  -- Transcript doc / certificate link (optional)

  -- Review workflow
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrawn')),
  equivalent_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  -- If approved, the local course this credit is mapped to (optional)
  equivalence_notes TEXT,
  awarded_credits NUMERIC(4,2) CHECK (awarded_credits IS NULL OR awarded_credits >= 0),
  -- Registrar may award fewer credits than submitted

  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_records_tenant ON credit_records(tenant_id);
CREATE INDEX idx_credit_records_student ON credit_records(student_id);
CREATE INDEX idx_credit_records_status ON credit_records(tenant_id, status);
CREATE INDEX idx_credit_records_issuing_tenant ON credit_records(issuing_tenant_id)
  WHERE issuing_tenant_id IS NOT NULL;
CREATE INDEX idx_credit_records_source_enrollment ON credit_records(source_enrollment_id)
  WHERE source_enrollment_id IS NOT NULL;

-- Students submit at most one review per completed cross-tenant enrollment
CREATE UNIQUE INDEX idx_credit_records_enrollment_unique
  ON credit_records(student_id, source_enrollment_id)
  WHERE source_enrollment_id IS NOT NULL;

DROP TRIGGER IF EXISTS trigger_credit_records_updated_at ON credit_records;
CREATE TRIGGER trigger_credit_records_updated_at
  BEFORE UPDATE ON credit_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE credit_records ENABLE ROW LEVEL SECURITY;

-- Students see their own records in the receiving tenant
CREATE POLICY "Students see own credit records" ON credit_records
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

-- Students submit credit records for themselves
CREATE POLICY "Students submit own credit records" ON credit_records
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

-- Students may withdraw their own pending records
CREATE POLICY "Students withdraw own pending credit records" ON credit_records
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND
    student_id = auth.uid() AND
    status IN ('pending', 'under_review')
  );

-- Registrars (tenant_admin, admin, super_admin) manage records in their tenant
CREATE POLICY "Registrars manage credit records" ON credit_records
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin')
    )
  );
