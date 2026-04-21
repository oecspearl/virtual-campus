-- ============================================================================
-- Part 29: Credit record comment thread
-- ============================================================================
-- Depends on: 027 (credit_records)
-- ============================================================================
-- Lets the submitting student and the reviewing registrar exchange messages
-- on a credit_record. Scoped to the receiving tenant (same as the parent
-- record). Visible to: the record's student, any registrar of the tenant,
-- and super_admin.
-- ============================================================================

CREATE TABLE public.credit_record_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  credit_record_id UUID NOT NULL REFERENCES credit_records(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_record_comments_record
  ON credit_record_comments(credit_record_id, created_at);
CREATE INDEX idx_credit_record_comments_tenant
  ON credit_record_comments(tenant_id);

ALTER TABLE credit_record_comments ENABLE ROW LEVEL SECURITY;

-- Student sees comments on their own records
CREATE POLICY "Student reads comments on own records" ON credit_record_comments
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM credit_records cr
      WHERE cr.id = credit_record_comments.credit_record_id
        AND cr.student_id = auth.uid()
    )
  );

-- Student writes comments on their own records
CREATE POLICY "Student writes comments on own records" ON credit_record_comments
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM credit_records cr
      WHERE cr.id = credit_record_comments.credit_record_id
        AND cr.student_id = auth.uid()
    )
  );

-- Registrars read/write all comments on records in their tenant
CREATE POLICY "Registrars manage comments" ON credit_record_comments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin')
    )
  );
