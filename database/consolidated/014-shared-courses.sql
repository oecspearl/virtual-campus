-- ============================================================================
-- Part 14: Cross-Tenant Course Sharing
-- ============================================================================
-- Allows courses to be shared across tenants. The source tenant owns the
-- course content (lessons, quizzes, assignments). Other tenants can enroll
-- their students, with enrollment/grade/progress data stored locally.
-- ============================================================================

-- ============================================================================
-- COURSE SHARES — tracks which courses are shared and to which tenants
-- ============================================================================

CREATE TABLE public.course_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  -- NULL target_tenant_id = shared with ALL tenants
  permission VARCHAR(20) NOT NULL DEFAULT 'enroll'
    CHECK (permission IN ('enroll', 'view_only')),
  shared_by UUID NOT NULL REFERENCES users(id),
  title_snapshot VARCHAR NOT NULL,
  description_snapshot TEXT,
  thumbnail_snapshot VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(course_id, target_tenant_id)
);

CREATE INDEX idx_course_shares_course ON course_shares(course_id);
CREATE INDEX idx_course_shares_source_tenant ON course_shares(source_tenant_id);
CREATE INDEX idx_course_shares_target_tenant ON course_shares(target_tenant_id);
CREATE INDEX idx_course_shares_active ON course_shares(revoked_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- CROSS-TENANT ENROLLMENTS — student data lives in the student's tenant
-- ============================================================================

CREATE TABLE public.cross_tenant_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- tenant_id = the student's tenant (where this record is scoped)
  course_share_id UUID NOT NULL REFERENCES course_shares(id) ON DELETE CASCADE,
  source_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dropped', 'completed')),
  progress_percentage INTEGER NOT NULL DEFAULT 0
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, source_course_id)
);

CREATE INDEX idx_cte_tenant ON cross_tenant_enrollments(tenant_id);
CREATE INDEX idx_cte_student ON cross_tenant_enrollments(student_id);
CREATE INDEX idx_cte_source_course ON cross_tenant_enrollments(source_course_id);
CREATE INDEX idx_cte_course_share ON cross_tenant_enrollments(course_share_id);
CREATE INDEX idx_cte_status ON cross_tenant_enrollments(status);

-- ============================================================================
-- CROSS-TENANT LESSON PROGRESS — tracks lesson completion per student
-- ============================================================================

CREATE TABLE public.cross_tenant_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES cross_tenant_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);

CREATE INDEX idx_ctlp_tenant ON cross_tenant_lesson_progress(tenant_id);
CREATE INDEX idx_ctlp_enrollment ON cross_tenant_lesson_progress(enrollment_id);
CREATE INDEX idx_ctlp_student ON cross_tenant_lesson_progress(student_id);

-- ============================================================================
-- CROSS-TENANT GRADES — stores grades for shared course assessments
-- ============================================================================

CREATE TABLE public.cross_tenant_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES cross_tenant_enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_type VARCHAR NOT NULL CHECK (assessment_type IN ('quiz', 'assignment', 'discussion', 'survey')),
  assessment_id UUID NOT NULL,
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES users(id),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, assessment_type, assessment_id)
);

CREATE INDEX idx_ctg_tenant ON cross_tenant_grades(tenant_id);
CREATE INDEX idx_ctg_enrollment ON cross_tenant_grades(enrollment_id);
CREATE INDEX idx_ctg_student ON cross_tenant_grades(student_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE course_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_tenant_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_tenant_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_tenant_grades ENABLE ROW LEVEL SECURITY;

-- Course shares: source tenant staff can manage, target tenants can view
CREATE POLICY "Source tenant staff can manage shares" ON course_shares
  FOR ALL USING (
    source_tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

CREATE POLICY "Target tenants can view active shares" ON course_shares
  FOR SELECT USING (
    revoked_at IS NULL AND (
      target_tenant_id IS NULL OR
      target_tenant_id = current_tenant_id()
    )
  );

-- Cross-tenant enrollments: students see their own, staff sees tenant's
CREATE POLICY "Students see own cross-tenant enrollments" ON cross_tenant_enrollments
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

CREATE POLICY "Staff manage cross-tenant enrollments" ON cross_tenant_enrollments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- Lesson progress: student sees own
CREATE POLICY "Students see own cross-tenant progress" ON cross_tenant_lesson_progress
  FOR ALL USING (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

CREATE POLICY "Staff view cross-tenant progress" ON cross_tenant_lesson_progress
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- Grades: student sees own
CREATE POLICY "Students see own cross-tenant grades" ON cross_tenant_grades
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

CREATE POLICY "Staff manage cross-tenant grades" ON cross_tenant_grades
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );
