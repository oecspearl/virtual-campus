-- STEP 5: RLS Policies, Grants, Triggers
-- Run this after step-4 succeeds

-- CRM Lifecycle policies
DROP POLICY IF EXISTS crm_lifecycle_staff_access ON crm_student_lifecycle;
CREATE POLICY crm_lifecycle_staff_access ON crm_student_lifecycle
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_lifecycle_student_read ON crm_student_lifecycle;
CREATE POLICY crm_lifecycle_student_read ON crm_student_lifecycle
  FOR SELECT USING (student_id = auth.uid());

-- CRM Interactions policies
DROP POLICY IF EXISTS crm_interactions_staff_access ON crm_interactions;
CREATE POLICY crm_interactions_staff_access ON crm_interactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_interactions_student_read ON crm_interactions;
CREATE POLICY crm_interactions_student_read ON crm_interactions
  FOR SELECT USING (student_id = auth.uid() AND is_private = false);

-- Engagement policies
DROP POLICY IF EXISTS crm_engagement_config_admin ON crm_engagement_config;
CREATE POLICY crm_engagement_config_admin ON crm_engagement_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_engagement_scores_staff_read ON crm_engagement_scores;
CREATE POLICY crm_engagement_scores_staff_read ON crm_engagement_scores
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

-- Segments policies
DROP POLICY IF EXISTS crm_segments_staff_access ON crm_segments;
CREATE POLICY crm_segments_staff_access ON crm_segments
  FOR ALL USING (
    created_by = auth.uid() OR is_shared = true OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_segment_members_staff_read ON crm_segment_members;
CREATE POLICY crm_segment_members_staff_read ON crm_segment_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

-- Campaigns policies
DROP POLICY IF EXISTS crm_campaigns_staff_access ON crm_campaigns;
CREATE POLICY crm_campaigns_staff_access ON crm_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_campaign_recipients_staff_read ON crm_campaign_recipients;
CREATE POLICY crm_campaign_recipients_staff_read ON crm_campaign_recipients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

-- Tasks policies
DROP POLICY IF EXISTS crm_tasks_access ON crm_tasks;
CREATE POLICY crm_tasks_access ON crm_tasks
  FOR ALL USING (
    assigned_to = auth.uid() OR created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

-- Workflows policies
DROP POLICY IF EXISTS crm_workflows_admin_access ON crm_workflows;
CREATE POLICY crm_workflows_admin_access ON crm_workflows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_workflow_executions_admin_read ON crm_workflow_executions;
CREATE POLICY crm_workflow_executions_admin_read ON crm_workflow_executions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

-- Programmes policies
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
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

-- Application fields policies
DROP POLICY IF EXISTS programme_application_fields_staff_all ON programme_application_fields;
CREATE POLICY programme_application_fields_staff_all ON programme_application_fields
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS programme_application_fields_anon_select ON programme_application_fields;
CREATE POLICY programme_application_fields_anon_select ON programme_application_fields
  FOR SELECT USING (true);

-- Application policies
DROP POLICY IF EXISTS programme_applications_staff_all ON programme_applications;
CREATE POLICY programme_applications_staff_all ON programme_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS programme_applications_student_select ON programme_applications;
CREATE POLICY programme_applications_student_select ON programme_applications
  FOR SELECT USING (applicant_id = auth.uid());

DROP POLICY IF EXISTS programme_applications_student_insert ON programme_applications;
CREATE POLICY programme_applications_student_insert ON programme_applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON crm_student_lifecycle TO service_role;
GRANT ALL ON crm_interactions TO service_role;
GRANT ALL ON crm_engagement_config TO service_role;
GRANT ALL ON crm_engagement_scores TO service_role;
GRANT ALL ON crm_segments TO service_role;
GRANT ALL ON crm_segment_members TO service_role;
GRANT ALL ON crm_campaigns TO service_role;
GRANT ALL ON crm_campaign_recipients TO service_role;
GRANT ALL ON crm_tasks TO service_role;
GRANT ALL ON crm_workflows TO service_role;
GRANT ALL ON crm_workflow_executions TO service_role;
GRANT SELECT ON programmes TO authenticated;
GRANT SELECT ON programme_courses TO authenticated;
GRANT SELECT, INSERT ON programme_enrollments TO authenticated;
GRANT ALL ON programmes TO service_role;
GRANT ALL ON programme_courses TO service_role;
GRANT ALL ON programme_enrollments TO service_role;
GRANT SELECT ON programme_application_fields TO authenticated;
GRANT SELECT, INSERT ON programme_applications TO authenticated;
GRANT SELECT ON programme_application_fields TO anon;
GRANT ALL ON programme_application_fields TO service_role;
GRANT ALL ON programme_applications TO service_role;

-- Default engagement config
INSERT INTO crm_engagement_config (config_name, is_active)
VALUES ('default', true)
ON CONFLICT DO NOTHING;

-- Auto-enroll trigger
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
  FOR EACH ROW EXECUTE FUNCTION auto_enroll_programme_courses();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Done! All CRM + Programme + Application tables are now set up.
