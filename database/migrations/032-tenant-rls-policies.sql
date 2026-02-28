-- ============================================================================
-- Migration 032: Tenant-Scoped RLS Policies (Defense-in-Depth)
-- ============================================================================
-- Updates all existing RLS policies to include tenant_id filtering.
-- Uses current_tenant_id() function (created in 030) which reads from
-- the app.current_tenant_id Postgres session variable.
--
-- This provides database-level tenant isolation as a safety net,
-- even though the application layer (tenant-query.ts) is the primary
-- isolation mechanism for service client queries.
-- ============================================================================

-- ============================================================================
-- LEARNING PATHS & COMPETENCIES
-- ============================================================================

-- learning_paths
DROP POLICY IF EXISTS "Anyone can view published learning paths" ON learning_paths;
CREATE POLICY "Anyone can view published learning paths" ON learning_paths
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (published = true OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')))
  );

DROP POLICY IF EXISTS "Admins can manage learning paths" ON learning_paths;
CREATE POLICY "Admins can manage learning paths" ON learning_paths
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
  );

-- learning_path_courses
DROP POLICY IF EXISTS "Anyone can view learning path courses" ON learning_path_courses;
CREATE POLICY "Anyone can view learning path courses" ON learning_path_courses
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage learning path courses" ON learning_path_courses;
CREATE POLICY "Admins can manage learning path courses" ON learning_path_courses
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
  );

-- learning_path_enrollments
DROP POLICY IF EXISTS "Users can view own path enrollments" ON learning_path_enrollments;
CREATE POLICY "Users can view own path enrollments" ON learning_path_enrollments
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (student_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor')))
  );

DROP POLICY IF EXISTS "Users can manage own path enrollments" ON learning_path_enrollments;
CREATE POLICY "Users can manage own path enrollments" ON learning_path_enrollments
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND (student_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')))
  );

-- competencies
DROP POLICY IF EXISTS "Anyone can view competencies" ON competencies;
CREATE POLICY "Anyone can view competencies" ON competencies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage competencies" ON competencies;
CREATE POLICY "Admins can manage competencies" ON competencies
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

-- course_competencies
DROP POLICY IF EXISTS "Anyone can view course competencies" ON course_competencies;
CREATE POLICY "Anyone can view course competencies" ON course_competencies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage course competencies" ON course_competencies;
CREATE POLICY "Admins can manage course competencies" ON course_competencies
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
  );

-- lesson_competencies
DROP POLICY IF EXISTS "Anyone can view lesson competencies" ON lesson_competencies;
CREATE POLICY "Anyone can view lesson competencies" ON lesson_competencies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage lesson competencies" ON lesson_competencies;
CREATE POLICY "Admins can manage lesson competencies" ON lesson_competencies
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
  );

-- student_competencies
DROP POLICY IF EXISTS "Users can view own competencies" ON student_competencies;
CREATE POLICY "Users can view own competencies" ON student_competencies
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (student_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor')))
  );

DROP POLICY IF EXISTS "System can manage student competencies" ON student_competencies;
CREATE POLICY "System can manage student competencies" ON student_competencies
  FOR ALL USING (tenant_id = current_tenant_id());

-- adaptive_rules
DROP POLICY IF EXISTS "Anyone can view active adaptive rules" ON adaptive_rules;
CREATE POLICY "Anyone can view active adaptive rules" ON adaptive_rules
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (is_active = true OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor')))
  );

DROP POLICY IF EXISTS "Instructors can manage adaptive rules" ON adaptive_rules;
CREATE POLICY "Instructors can manage adaptive rules" ON adaptive_rules
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor'))
  );

-- student_adaptive_recommendations
DROP POLICY IF EXISTS "Users can view own recommendations" ON student_adaptive_recommendations;
CREATE POLICY "Users can view own recommendations" ON student_adaptive_recommendations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (student_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor')))
  );

DROP POLICY IF EXISTS "Users can update own recommendations" ON student_adaptive_recommendations;
CREATE POLICY "Users can update own recommendations" ON student_adaptive_recommendations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND student_id = auth.uid()
  );

-- ============================================================================
-- CRM TABLES
-- ============================================================================

DROP POLICY IF EXISTS crm_lifecycle_staff_access ON crm_student_lifecycle;
CREATE POLICY crm_lifecycle_staff_access ON crm_student_lifecycle
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_lifecycle_student_read ON crm_student_lifecycle;
CREATE POLICY crm_lifecycle_student_read ON crm_student_lifecycle
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND student_id = auth.uid()
  );

DROP POLICY IF EXISTS crm_interactions_staff_access ON crm_interactions;
CREATE POLICY crm_interactions_staff_access ON crm_interactions
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_interactions_student_read ON crm_interactions;
CREATE POLICY crm_interactions_student_read ON crm_interactions
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND student_id = auth.uid() AND is_private = false
  );

DROP POLICY IF EXISTS crm_engagement_config_admin ON crm_engagement_config;
CREATE POLICY crm_engagement_config_admin ON crm_engagement_config
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_engagement_scores_staff_read ON crm_engagement_scores;
CREATE POLICY crm_engagement_scores_staff_read ON crm_engagement_scores
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (student_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin')))
  );

DROP POLICY IF EXISTS crm_segments_staff_access ON crm_segments;
CREATE POLICY crm_segments_staff_access ON crm_segments
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND (created_by = auth.uid() OR is_shared = true OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')))
  );

DROP POLICY IF EXISTS crm_segment_members_staff_read ON crm_segment_members;
CREATE POLICY crm_segment_members_staff_read ON crm_segment_members
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_campaigns_staff_access ON crm_campaigns;
CREATE POLICY crm_campaigns_staff_access ON crm_campaigns
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_campaign_recipients_staff_read ON crm_campaign_recipients;
CREATE POLICY crm_campaign_recipients_staff_read ON crm_campaign_recipients
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_tasks_access ON crm_tasks;
CREATE POLICY crm_tasks_access ON crm_tasks
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND (assigned_to = auth.uid() OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')))
  );

DROP POLICY IF EXISTS crm_workflows_admin_access ON crm_workflows;
CREATE POLICY crm_workflows_admin_access ON crm_workflows
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_workflow_executions_admin_read ON crm_workflow_executions;
CREATE POLICY crm_workflow_executions_admin_read ON crm_workflow_executions
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

-- ============================================================================
-- PROGRAMMES
-- ============================================================================

DROP POLICY IF EXISTS "Published programmes are viewable by everyone" ON programmes;
CREATE POLICY "Published programmes are viewable by everyone" ON programmes
  FOR SELECT USING (tenant_id = current_tenant_id() AND published = true);

DROP POLICY IF EXISTS "Staff can view all programmes" ON programmes;
CREATE POLICY "Staff can view all programmes" ON programmes
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Staff can manage programmes" ON programmes;
CREATE POLICY "Staff can manage programmes" ON programmes
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS "Programme courses viewable with programme" ON programme_courses;
CREATE POLICY "Programme courses viewable with programme" ON programme_courses
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (EXISTS (SELECT 1 FROM programmes WHERE programmes.id = programme_courses.programme_id AND programmes.published = true)
         OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')))
  );

DROP POLICY IF EXISTS "Staff can manage programme courses" ON programme_courses;
CREATE POLICY "Staff can manage programme courses" ON programme_courses
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS "Students can view own enrollments" ON programme_enrollments;
CREATE POLICY "Students can view own programme enrollments" ON programme_enrollments
  FOR SELECT USING (tenant_id = current_tenant_id() AND student_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all enrollments" ON programme_enrollments;
CREATE POLICY "Staff can view all programme enrollments" ON programme_enrollments
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Students can enroll themselves" ON programme_enrollments;
CREATE POLICY "Students can enroll themselves" ON programme_enrollments
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND student_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage enrollments" ON programme_enrollments;
CREATE POLICY "Staff can manage programme enrollments" ON programme_enrollments
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

-- programme_application_fields
DROP POLICY IF EXISTS programme_application_fields_staff_all ON programme_application_fields;
CREATE POLICY programme_application_fields_staff_all ON programme_application_fields
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS programme_application_fields_anon_select ON programme_application_fields;
CREATE POLICY programme_application_fields_anon_select ON programme_application_fields
  FOR SELECT USING (tenant_id = current_tenant_id());

-- programme_applications
DROP POLICY IF EXISTS programme_applications_staff_all ON programme_applications;
CREATE POLICY programme_applications_staff_all ON programme_applications
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS programme_applications_student_select ON programme_applications;
CREATE POLICY programme_applications_student_select ON programme_applications
  FOR SELECT USING (tenant_id = current_tenant_id() AND applicant_id = auth.uid());

DROP POLICY IF EXISTS programme_applications_student_insert ON programme_applications;
CREATE POLICY programme_applications_student_insert ON programme_applications
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND applicant_id = auth.uid());

-- ============================================================================
-- AI TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_conversations;
CREATE POLICY "Users can view their own conversations" ON ai_conversations
  FOR SELECT USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON ai_conversations;
CREATE POLICY "Users can insert their own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON ai_conversations;
CREATE POLICY "Users can update their own conversations" ON ai_conversations
  FOR UPDATE USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON ai_conversations;
CREATE POLICY "Users can delete their own conversations" ON ai_conversations
  FOR DELETE USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON ai_messages;
CREATE POLICY "Users can view messages from their conversations" ON ai_messages
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON ai_messages;
CREATE POLICY "Users can insert messages to their conversations" ON ai_messages
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update messages from their conversations" ON ai_messages;
CREATE POLICY "Users can update messages from their conversations" ON ai_messages
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON ai_messages;
CREATE POLICY "Users can delete messages from their conversations" ON ai_messages
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can view their own usage tracking" ON ai_usage_tracking
  FOR SELECT USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can insert their own usage tracking" ON ai_usage_tracking
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can update their own usage tracking" ON ai_usage_tracking
  FOR UPDATE USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own context cache" ON ai_context_cache;
CREATE POLICY "Users can view their own context cache" ON ai_context_cache
  FOR SELECT USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own context cache" ON ai_context_cache;
CREATE POLICY "Users can insert their own context cache" ON ai_context_cache
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own context cache" ON ai_context_cache;
CREATE POLICY "Users can update their own context cache" ON ai_context_cache
  FOR UPDATE USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own context cache" ON ai_context_cache;
CREATE POLICY "Users can delete their own context cache" ON ai_context_cache
  FOR DELETE USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

-- ============================================================================
-- STUDENT EXPERIENCE TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own notes" ON student_notes;
CREATE POLICY "Users can manage own notes" ON student_notes
  FOR ALL USING (tenant_id = current_tenant_id() AND auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON student_bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON student_bookmarks
  FOR ALL USING (tenant_id = current_tenant_id() AND auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can manage own calendar events" ON student_calendar_events;
CREATE POLICY "Users can manage own calendar events" ON student_calendar_events
  FOR ALL USING (tenant_id = current_tenant_id() AND auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can manage own todos" ON student_todos;
CREATE POLICY "Users can manage own todos" ON student_todos
  FOR ALL USING (tenant_id = current_tenant_id() AND auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can manage own study sessions" ON student_study_sessions;
CREATE POLICY "Users can manage own study sessions" ON student_study_sessions
  FOR ALL USING (tenant_id = current_tenant_id() AND auth.uid() = student_id);

-- ============================================================================
-- STUDY GROUPS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view public groups or joined groups" ON study_groups;
CREATE POLICY "Users can view public groups or joined groups" ON study_groups
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (NOT is_private OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_groups.id AND student_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create groups" ON study_groups;
CREATE POLICY "Users can create groups" ON study_groups
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Group owners can update groups" ON study_groups;
CREATE POLICY "Group owners can update groups" ON study_groups
  FOR UPDATE USING (tenant_id = current_tenant_id() AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Group owners can delete groups" ON study_groups;
CREATE POLICY "Group owners can delete groups" ON study_groups
  FOR DELETE USING (tenant_id = current_tenant_id() AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Members can view group memberships" ON study_group_members;
CREATE POLICY "Members can view group memberships" ON study_group_members
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (EXISTS (SELECT 1 FROM study_group_members m WHERE m.group_id = study_group_members.group_id AND m.student_id = auth.uid())
         OR EXISTS (SELECT 1 FROM study_groups g WHERE g.id = study_group_members.group_id AND g.created_by = auth.uid()))
  );

DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;
CREATE POLICY "Users can join groups" ON study_group_members
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can leave groups" ON study_group_members;
CREATE POLICY "Users can leave groups" ON study_group_members
  FOR DELETE USING (tenant_id = current_tenant_id() AND auth.uid() = student_id);

DROP POLICY IF EXISTS "Members can view group messages" ON study_group_messages;
CREATE POLICY "Members can view group messages" ON study_group_messages
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_messages.group_id AND student_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can send messages" ON study_group_messages;
CREATE POLICY "Members can send messages" ON study_group_messages
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_messages.group_id AND student_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can view group events" ON study_group_events;
CREATE POLICY "Members can view group events" ON study_group_events
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_events.group_id AND student_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners and moderators can manage events" ON study_group_events;
CREATE POLICY "Owners and moderators can manage events" ON study_group_events
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND (auth.uid() = created_by OR EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_events.group_id AND student_id = auth.uid() AND role IN ('owner', 'moderator')))
  );

-- ============================================================================
-- ADMISSIONS
-- ============================================================================

DROP POLICY IF EXISTS admission_forms_staff_all ON admission_forms;
CREATE POLICY admission_forms_staff_all ON admission_forms
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS admission_forms_anon_select ON admission_forms;
CREATE POLICY admission_forms_anon_select ON admission_forms
  FOR SELECT USING (tenant_id = current_tenant_id() AND status = 'published');

DROP POLICY IF EXISTS admission_fields_staff_all ON admission_form_fields;
CREATE POLICY admission_fields_staff_all ON admission_form_fields
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS admission_fields_anon_select ON admission_form_fields;
CREATE POLICY admission_fields_anon_select ON admission_form_fields
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM admission_forms WHERE admission_forms.id = form_id AND admission_forms.status = 'published')
  );

DROP POLICY IF EXISTS admission_apps_staff_all ON admission_applications;
CREATE POLICY admission_apps_staff_all ON admission_applications
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS admission_apps_anon_insert ON admission_applications;
CREATE POLICY admission_apps_anon_insert ON admission_applications
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS admission_docs_staff_all ON admission_documents;
CREATE POLICY admission_docs_staff_all ON admission_documents
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS admission_docs_anon_insert ON admission_documents;
CREATE POLICY admission_docs_anon_insert ON admission_documents
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS admission_reviews_staff_all ON admission_reviews;
CREATE POLICY admission_reviews_staff_all ON admission_reviews
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

-- ============================================================================
-- ACCESSIBILITY & I18N
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read accessibility reports" ON accessibility_reports;
CREATE POLICY "Anyone can read accessibility reports" ON accessibility_reports
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage accessibility reports" ON accessibility_reports;
CREATE POLICY "Admins can manage accessibility reports" ON accessibility_reports
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS "Anyone can read video captions" ON video_captions;
CREATE POLICY "Anyone can read video captions" ON video_captions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage video captions" ON video_captions;
CREATE POLICY "Admins can manage video captions" ON video_captions
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS "Users can read own accessibility preferences" ON accessibility_preferences;
CREATE POLICY "Users can read own accessibility preferences" ON accessibility_preferences
  FOR SELECT USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own accessibility preferences" ON accessibility_preferences;
CREATE POLICY "Users can manage own accessibility preferences" ON accessibility_preferences
  FOR ALL USING (tenant_id = current_tenant_id() AND auth.uid() = user_id);
