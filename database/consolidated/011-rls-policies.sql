-- ============================================================================
-- Migration 011: Row Level Security Policies (All Tables)
-- ============================================================================
-- All policies include tenant_id = current_tenant_id() for tenant isolation.
-- Tables with is_global use: (tenant_id = current_tenant_id() OR is_global = true)
-- Roles: super_admin > tenant_admin > admin > instructor > curriculum_designer > student > parent
-- ============================================================================


-- ############################################################################
-- SECTION 1: ENABLE RLS ON ALL TABLES
-- ############################################################################

-- Foundation
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Courses & Structure
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Assessments
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_proctor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Grading
ALTER TABLE course_gradebook_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_grade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_item_progress ENABLE ROW LEVEL SECURITY;

-- Discussions
ALTER TABLE course_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_rubric_templates ENABLE ROW LEVEL SECURITY;

-- Announcements & Content
ALTER TABLE course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_links ENABLE ROW LEVEL SECURITY;

-- SCORM & Video
ALTER TABLE scorm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorm_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Peer Review & Groups
ALTER TABLE peer_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_group_members ENABLE ROW LEVEL SECURITY;

-- Credentials & Gamification
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceu_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- AI Tutor
ALTER TABLE ai_tutor_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_analytics ENABLE ROW LEVEL SECURITY;

-- Notifications & Analytics (006)
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Learning Paths & Student Experience (007)
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_adaptive_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_study_sessions ENABLE ROW LEVEL SECURITY;

-- Surveys, Categories, i18n, Accessibility, Programmes, Admissions (008)
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessibility_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessibility_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_reviews ENABLE ROW LEVEL SECURITY;

-- CRM (009)
ALTER TABLE crm_student_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_engagement_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_application_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_applications ENABLE ROW LEVEL SECURITY;

-- Global Discussions & Advanced Analytics (010)
ALTER TABLE global_discussion_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_discussion_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_warehouse_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl_pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl_pipeline_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_risk_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE omnichannel_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_announcements ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 2: RLS POLICIES
-- ############################################################################


-- ============================================================================
-- TENANT INFRASTRUCTURE
-- ============================================================================

-- tenants
DROP POLICY IF EXISTS "Members can view their tenant" ON tenants;
CREATE POLICY "Members can view their tenant" ON tenants
  FOR SELECT USING (
    id = current_tenant_id() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admin can manage all tenants" ON tenants;
CREATE POLICY "Super admin can manage all tenants" ON tenants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Tenant admin can update own tenant" ON tenants;
CREATE POLICY "Tenant admin can update own tenant" ON tenants
  FOR UPDATE USING (
    id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('tenant_admin', 'admin'))
  );

-- tenant_memberships
DROP POLICY IF EXISTS "View memberships in own tenant" ON tenant_memberships;
CREATE POLICY "View memberships in own tenant" ON tenant_memberships
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage memberships" ON tenant_memberships;
CREATE POLICY "Admin can manage memberships" ON tenant_memberships
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );


-- ============================================================================
-- USERS & PROFILES
-- ============================================================================

-- users
DROP POLICY IF EXISTS "Users can view users in same tenant" ON users;
CREATE POLICY "Users can view users in same tenant" ON users
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (id = auth.uid() AND tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage users" ON users;
CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    current_user_role() IN ('super_admin', 'tenant_admin', 'admin')
  );

-- user_profiles
DROP POLICY IF EXISTS "Users can view profiles in same tenant" ON user_profiles;
CREATE POLICY "Users can view profiles in same tenant" ON user_profiles
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid() AND tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage profiles" ON user_profiles;
CREATE POLICY "Admin can manage profiles" ON user_profiles
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );


-- ============================================================================
-- SETTINGS
-- ============================================================================

-- site_settings
DROP POLICY IF EXISTS "Authenticated can read tenant settings" ON site_settings;
CREATE POLICY "Authenticated can read tenant settings" ON site_settings
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage tenant settings" ON site_settings;
CREATE POLICY "Admin can manage tenant settings" ON site_settings
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- system_settings
DROP POLICY IF EXISTS "Admin can view system settings" ON system_settings;
CREATE POLICY "Admin can view system settings" ON system_settings
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin'))
  );

DROP POLICY IF EXISTS "Admin can manage system settings" ON system_settings;
CREATE POLICY "Admin can manage system settings" ON system_settings
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin'))
  );


-- ============================================================================
-- COURSES & STRUCTURE
-- ============================================================================

-- courses
DROP POLICY IF EXISTS "Published courses visible to tenant" ON courses;
CREATE POLICY "Published courses visible to tenant" ON courses
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      published = true OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage courses" ON courses;
CREATE POLICY "Staff can manage courses" ON courses
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- subjects (has is_global)
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
CREATE POLICY "Anyone can view subjects" ON subjects
  FOR SELECT USING (tenant_id = current_tenant_id() OR is_global = true);

DROP POLICY IF EXISTS "Staff can manage subjects" ON subjects;
CREATE POLICY "Staff can manage subjects" ON subjects
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'curriculum_designer'))
  );

-- lessons
DROP POLICY IF EXISTS "Lessons visible to tenant" ON lessons;
CREATE POLICY "Lessons visible to tenant" ON lessons
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage lessons" ON lessons;
CREATE POLICY "Staff can manage lessons" ON lessons
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- course_instructors
DROP POLICY IF EXISTS "View course instructors" ON course_instructors;
CREATE POLICY "View course instructors" ON course_instructors
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage course instructors" ON course_instructors;
CREATE POLICY "Admin can manage course instructors" ON course_instructors
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- classes
DROP POLICY IF EXISTS "View classes in tenant" ON classes;
CREATE POLICY "View classes in tenant" ON classes
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage classes" ON classes;
CREATE POLICY "Staff can manage classes" ON classes
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- class_instructors
DROP POLICY IF EXISTS "View class instructors" ON class_instructors;
CREATE POLICY "View class instructors" ON class_instructors
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage class instructors" ON class_instructors;
CREATE POLICY "Admin can manage class instructors" ON class_instructors
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- class_students
DROP POLICY IF EXISTS "View class students" ON class_students;
CREATE POLICY "View class students" ON class_students
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage class students" ON class_students;
CREATE POLICY "Staff can manage class students" ON class_students
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );


-- ============================================================================
-- ENROLLMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Students see own enrollments" ON enrollments;
CREATE POLICY "Students see own enrollments" ON enrollments
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Students can self-enroll" ON enrollments;
CREATE POLICY "Students can self-enroll" ON enrollments
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admin can manage enrollments" ON enrollments;
CREATE POLICY "Admin can manage enrollments" ON enrollments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );


-- ============================================================================
-- ASSESSMENTS
-- ============================================================================

-- quizzes
DROP POLICY IF EXISTS "View quizzes in tenant" ON quizzes;
CREATE POLICY "View quizzes in tenant" ON quizzes
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage quizzes" ON quizzes;
CREATE POLICY "Staff can manage quizzes" ON quizzes
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- questions
DROP POLICY IF EXISTS "View questions in tenant" ON questions;
CREATE POLICY "View questions in tenant" ON questions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage questions" ON questions;
CREATE POLICY "Staff can manage questions" ON questions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- quiz_attempts
DROP POLICY IF EXISTS "Students see own attempts" ON quiz_attempts;
CREATE POLICY "Students see own attempts" ON quiz_attempts
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Students can insert own attempts" ON quiz_attempts;
CREATE POLICY "Students can insert own attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Students can update own attempts" ON quiz_attempts;
CREATE POLICY "Students can update own attempts" ON quiz_attempts
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- quiz_proctor_logs
DROP POLICY IF EXISTS "Staff can manage proctor logs" ON quiz_proctor_logs;
CREATE POLICY "Staff can manage proctor logs" ON quiz_proctor_logs
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

DROP POLICY IF EXISTS "Students can insert own proctor logs" ON quiz_proctor_logs;
CREATE POLICY "Students can insert own proctor logs" ON quiz_proctor_logs
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM quiz_attempts WHERE quiz_attempts.id = quiz_proctor_logs.quiz_attempt_id AND quiz_attempts.student_id = auth.uid())
  );

-- quiz_extensions
DROP POLICY IF EXISTS "Staff can manage quiz extensions" ON quiz_extensions;
CREATE POLICY "Staff can manage quiz extensions" ON quiz_extensions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

DROP POLICY IF EXISTS "Students can view own extensions" ON quiz_extensions;
CREATE POLICY "Students can view own extensions" ON quiz_extensions
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

-- assignments
DROP POLICY IF EXISTS "View assignments in tenant" ON assignments;
CREATE POLICY "View assignments in tenant" ON assignments
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage assignments" ON assignments;
CREATE POLICY "Staff can manage assignments" ON assignments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- assignment_submissions
DROP POLICY IF EXISTS "Students see own submissions" ON assignment_submissions;
CREATE POLICY "Students see own submissions" ON assignment_submissions
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Students can submit assignments" ON assignment_submissions;
CREATE POLICY "Students can submit assignments" ON assignment_submissions
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Staff can manage submissions" ON assignment_submissions;
CREATE POLICY "Staff can manage submissions" ON assignment_submissions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );


-- ============================================================================
-- GRADING
-- ============================================================================

-- course_gradebook_settings
DROP POLICY IF EXISTS "View gradebook settings" ON course_gradebook_settings;
CREATE POLICY "View gradebook settings" ON course_gradebook_settings
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage gradebook settings" ON course_gradebook_settings;
CREATE POLICY "Staff can manage gradebook settings" ON course_gradebook_settings
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- course_grade_items
DROP POLICY IF EXISTS "View grade items" ON course_grade_items;
CREATE POLICY "View grade items" ON course_grade_items
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage grade items" ON course_grade_items;
CREATE POLICY "Staff can manage grade items" ON course_grade_items
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- course_grades
DROP POLICY IF EXISTS "Students see own grades" ON course_grades;
CREATE POLICY "Students see own grades" ON course_grades
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage grades" ON course_grades;
CREATE POLICY "Staff can manage grades" ON course_grades
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- grade_items
DROP POLICY IF EXISTS "View grade items legacy" ON grade_items;
CREATE POLICY "View grade items legacy" ON grade_items
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage grade items legacy" ON grade_items;
CREATE POLICY "Staff can manage grade items legacy" ON grade_items
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- grades
DROP POLICY IF EXISTS "Students see own grades legacy" ON grades;
CREATE POLICY "Students see own grades legacy" ON grades
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage grades legacy" ON grades;
CREATE POLICY "Staff can manage grades legacy" ON grades
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- lesson_progress
DROP POLICY IF EXISTS "Students manage own lesson progress" ON lesson_progress;
CREATE POLICY "Students manage own lesson progress" ON lesson_progress
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- progress
DROP POLICY IF EXISTS "Students manage own progress" ON progress;
CREATE POLICY "Students manage own progress" ON progress
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- content_item_progress
DROP POLICY IF EXISTS "Students manage own content progress" ON content_item_progress;
CREATE POLICY "Students manage own content progress" ON content_item_progress
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );


-- ============================================================================
-- DISCUSSIONS
-- ============================================================================

-- course_discussions
DROP POLICY IF EXISTS "View course discussions" ON course_discussions;
CREATE POLICY "View course discussions" ON course_discussions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Authenticated can create discussions" ON course_discussions;
CREATE POLICY "Authenticated can create discussions" ON course_discussions
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authors and staff can manage discussions" ON course_discussions;
CREATE POLICY "Authors and staff can manage discussions" ON course_discussions
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Authors and staff can delete discussions" ON course_discussions;
CREATE POLICY "Authors and staff can delete discussions" ON course_discussions
  FOR DELETE USING (
    tenant_id = current_tenant_id() AND (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- discussions
DROP POLICY IF EXISTS "View discussions in tenant" ON discussions;
CREATE POLICY "View discussions in tenant" ON discussions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Authenticated can create" ON discussions;
CREATE POLICY "Authenticated can create" ON discussions
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authors and staff manage" ON discussions;
CREATE POLICY "Authors and staff manage" ON discussions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- discussion_replies
DROP POLICY IF EXISTS "View replies in tenant" ON discussion_replies;
CREATE POLICY "View replies in tenant" ON discussion_replies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Authenticated can reply" ON discussion_replies;
CREATE POLICY "Authenticated can reply" ON discussion_replies
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors and staff manage replies" ON discussion_replies;
CREATE POLICY "Authors and staff manage replies" ON discussion_replies
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- discussion_votes
DROP POLICY IF EXISTS "View votes in tenant" ON discussion_votes;
CREATE POLICY "View votes in tenant" ON discussion_votes
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Users manage own votes" ON discussion_votes;
CREATE POLICY "Users manage own votes" ON discussion_votes
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- lesson_discussions
DROP POLICY IF EXISTS "View lesson discussions" ON lesson_discussions;
CREATE POLICY "View lesson discussions" ON lesson_discussions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Authenticated can create lesson discussions" ON lesson_discussions;
CREATE POLICY "Authenticated can create lesson discussions" ON lesson_discussions
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors and staff manage lesson discussions" ON lesson_discussions;
CREATE POLICY "Authors and staff manage lesson discussions" ON lesson_discussions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- lesson_discussion_replies
DROP POLICY IF EXISTS "View lesson discussion replies" ON lesson_discussion_replies;
CREATE POLICY "View lesson discussion replies" ON lesson_discussion_replies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Authenticated can reply to lesson discussions" ON lesson_discussion_replies;
CREATE POLICY "Authenticated can reply to lesson discussions" ON lesson_discussion_replies
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors and staff manage lesson replies" ON lesson_discussion_replies;
CREATE POLICY "Authors and staff manage lesson replies" ON lesson_discussion_replies
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- lesson_discussion_votes
DROP POLICY IF EXISTS "View lesson discussion votes" ON lesson_discussion_votes;
CREATE POLICY "View lesson discussion votes" ON lesson_discussion_votes
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Users manage own lesson discussion votes" ON lesson_discussion_votes;
CREATE POLICY "Users manage own lesson discussion votes" ON lesson_discussion_votes
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- discussion_grades
DROP POLICY IF EXISTS "Students see own discussion grades" ON discussion_grades;
CREATE POLICY "Students see own discussion grades" ON discussion_grades
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage discussion grades" ON discussion_grades;
CREATE POLICY "Staff can manage discussion grades" ON discussion_grades
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- discussion_rubric_templates
DROP POLICY IF EXISTS "View rubric templates" ON discussion_rubric_templates;
CREATE POLICY "View rubric templates" ON discussion_rubric_templates
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage rubric templates" ON discussion_rubric_templates;
CREATE POLICY "Staff can manage rubric templates" ON discussion_rubric_templates
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );


-- ============================================================================
-- ANNOUNCEMENTS & CONTENT
-- ============================================================================

-- course_announcements
DROP POLICY IF EXISTS "View announcements in tenant" ON course_announcements;
CREATE POLICY "View announcements in tenant" ON course_announcements
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage announcements" ON course_announcements;
CREATE POLICY "Staff can manage announcements" ON course_announcements
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- announcement_views
DROP POLICY IF EXISTS "Users manage own announcement views" ON announcement_views;
CREATE POLICY "Users manage own announcement views" ON announcement_views
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- files
DROP POLICY IF EXISTS "View files in tenant" ON files;
CREATE POLICY "View files in tenant" ON files
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Authenticated can upload files" ON files;
CREATE POLICY "Authenticated can upload files" ON files
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Staff can manage files" ON files;
CREATE POLICY "Staff can manage files" ON files
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      uploaded_by = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- resource_links
DROP POLICY IF EXISTS "View resource links in tenant" ON resource_links;
CREATE POLICY "View resource links in tenant" ON resource_links
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage resource links" ON resource_links;
CREATE POLICY "Staff can manage resource links" ON resource_links
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );


-- ============================================================================
-- SCORM & VIDEO CONFERENCES
-- ============================================================================

-- scorm_packages
DROP POLICY IF EXISTS "View SCORM packages" ON scorm_packages;
CREATE POLICY "View SCORM packages" ON scorm_packages
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage SCORM packages" ON scorm_packages;
CREATE POLICY "Staff can manage SCORM packages" ON scorm_packages
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- scorm_tracking
DROP POLICY IF EXISTS "Students manage own SCORM tracking" ON scorm_tracking;
CREATE POLICY "Students manage own SCORM tracking" ON scorm_tracking
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- video_conferences
DROP POLICY IF EXISTS "View conferences in tenant" ON video_conferences;
CREATE POLICY "View conferences in tenant" ON video_conferences
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage conferences" ON video_conferences;
CREATE POLICY "Staff can manage conferences" ON video_conferences
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- conference_participants
DROP POLICY IF EXISTS "View conference participants" ON conference_participants;
CREATE POLICY "View conference participants" ON conference_participants
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Manage conference participation" ON conference_participants;
CREATE POLICY "Manage conference participation" ON conference_participants
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- conference_recordings
DROP POLICY IF EXISTS "View conference recordings" ON conference_recordings;
CREATE POLICY "View conference recordings" ON conference_recordings
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage recordings" ON conference_recordings;
CREATE POLICY "Staff can manage recordings" ON conference_recordings
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- attendance
DROP POLICY IF EXISTS "View attendance in tenant" ON attendance;
CREATE POLICY "View attendance in tenant" ON attendance
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage attendance" ON attendance;
CREATE POLICY "Staff can manage attendance" ON attendance
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );


-- ============================================================================
-- PEER REVIEW & GROUPS
-- ============================================================================

-- peer_review_assignments
DROP POLICY IF EXISTS "View peer review assignments" ON peer_review_assignments;
CREATE POLICY "View peer review assignments" ON peer_review_assignments
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      reviewer_id = auth.uid() OR
      EXISTS (SELECT 1 FROM assignment_submissions WHERE assignment_submissions.id = peer_review_assignments.submission_id AND assignment_submissions.student_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage peer review assignments" ON peer_review_assignments;
CREATE POLICY "Staff can manage peer review assignments" ON peer_review_assignments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- peer_reviews
DROP POLICY IF EXISTS "View peer reviews" ON peer_reviews;
CREATE POLICY "View peer reviews" ON peer_reviews
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      reviewer_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Reviewers can submit reviews" ON peer_reviews;
CREATE POLICY "Reviewers can submit reviews" ON peer_reviews
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND reviewer_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage peer reviews" ON peer_reviews;
CREATE POLICY "Staff can manage peer reviews" ON peer_reviews
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- course_groups
DROP POLICY IF EXISTS "View course groups" ON course_groups;
CREATE POLICY "View course groups" ON course_groups
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage course groups" ON course_groups;
CREATE POLICY "Staff can manage course groups" ON course_groups
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- course_group_members
DROP POLICY IF EXISTS "View group members" ON course_group_members;
CREATE POLICY "View group members" ON course_group_members
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage group members" ON course_group_members;
CREATE POLICY "Staff can manage group members" ON course_group_members
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );


-- ============================================================================
-- CREDENTIALS & GAMIFICATION
-- ============================================================================

-- badges
DROP POLICY IF EXISTS "View badges in tenant" ON badges;
CREATE POLICY "View badges in tenant" ON badges
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage badges" ON badges;
CREATE POLICY "Staff can manage badges" ON badges
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- user_badges
DROP POLICY IF EXISTS "Users see own badges" ON user_badges;
CREATE POLICY "Users see own badges" ON user_badges
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage user badges" ON user_badges;
CREATE POLICY "Staff can manage user badges" ON user_badges
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- certificate_templates
DROP POLICY IF EXISTS "View certificate templates" ON certificate_templates;
CREATE POLICY "View certificate templates" ON certificate_templates
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage certificate templates" ON certificate_templates;
CREATE POLICY "Staff can manage certificate templates" ON certificate_templates
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- certificates
DROP POLICY IF EXISTS "Users see own certificates" ON certificates;
CREATE POLICY "Users see own certificates" ON certificates
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage certificates" ON certificates;
CREATE POLICY "Staff can manage certificates" ON certificates
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- ceu_credits
DROP POLICY IF EXISTS "Users see own CEU credits" ON ceu_credits;
CREATE POLICY "Users see own CEU credits" ON ceu_credits
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage CEU credits" ON ceu_credits;
CREATE POLICY "Staff can manage CEU credits" ON ceu_credits
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- gamification_profiles
DROP POLICY IF EXISTS "Users see own gamification profile" ON gamification_profiles;
CREATE POLICY "Users see own gamification profile" ON gamification_profiles
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- gamification_xp_ledger
DROP POLICY IF EXISTS "Users see own XP ledger" ON gamification_xp_ledger;
CREATE POLICY "Users see own XP ledger" ON gamification_xp_ledger
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- transcripts
DROP POLICY IF EXISTS "Users see own transcripts" ON transcripts;
CREATE POLICY "Users see own transcripts" ON transcripts
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );


-- ============================================================================
-- AI TUTOR
-- ============================================================================

-- ai_tutor_preferences
DROP POLICY IF EXISTS "Users manage own AI tutor prefs" ON ai_tutor_preferences;
CREATE POLICY "Users manage own AI tutor prefs" ON ai_tutor_preferences
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin'))
    )
  );

-- ai_tutor_conversations
DROP POLICY IF EXISTS "Users manage own AI tutor conversations" ON ai_tutor_conversations;
CREATE POLICY "Users manage own AI tutor conversations" ON ai_tutor_conversations
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'instructor'))
    )
  );

-- ai_tutor_analytics
DROP POLICY IF EXISTS "Users see own AI tutor analytics" ON ai_tutor_analytics;
CREATE POLICY "Users see own AI tutor analytics" ON ai_tutor_analytics
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage AI tutor analytics" ON ai_tutor_analytics;
CREATE POLICY "Staff can manage AI tutor analytics" ON ai_tutor_analytics
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin'))
  );


-- ============================================================================
-- NOTIFICATIONS & EMAIL (006)
-- ============================================================================

-- in_app_notifications
DROP POLICY IF EXISTS "Users see own notifications" ON in_app_notifications;
CREATE POLICY "Users see own notifications" ON in_app_notifications
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- ai_context_cache (refs auth.users)
DROP POLICY IF EXISTS "Users manage own context cache" ON ai_context_cache;
CREATE POLICY "Users manage own context cache" ON ai_context_cache
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- ai_conversations (refs auth.users)
DROP POLICY IF EXISTS "Users manage own AI conversations" ON ai_conversations;
CREATE POLICY "Users manage own AI conversations" ON ai_conversations
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- ai_messages
DROP POLICY IF EXISTS "Users manage own AI messages" ON ai_messages;
CREATE POLICY "Users manage own AI messages" ON ai_messages
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

-- ai_usage_tracking (refs auth.users)
DROP POLICY IF EXISTS "Users see own AI usage" ON ai_usage_tracking;
CREATE POLICY "Users see own AI usage" ON ai_usage_tracking
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- notification_preferences (refs auth.users)
DROP POLICY IF EXISTS "Users manage own notification prefs" ON notification_preferences;
CREATE POLICY "Users manage own notification prefs" ON notification_preferences
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admin can view all notification prefs" ON notification_preferences;
CREATE POLICY "Admin can view all notification prefs" ON notification_preferences
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- email_notifications
DROP POLICY IF EXISTS "Users see own email notifications" ON email_notifications;
CREATE POLICY "Users see own email notifications" ON email_notifications
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- email_digests
DROP POLICY IF EXISTS "Users manage own email digests" ON email_digests;
CREATE POLICY "Users manage own email digests" ON email_digests
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- email_templates
DROP POLICY IF EXISTS "View email templates" ON email_templates;
CREATE POLICY "View email templates" ON email_templates
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage email templates" ON email_templates;
CREATE POLICY "Admin can manage email templates" ON email_templates
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );


-- ============================================================================
-- ANALYTICS (006)
-- ============================================================================

-- student_activity_log (uses student_id)
DROP POLICY IF EXISTS "Users see own activity" ON student_activity_log;
CREATE POLICY "Users see own activity" ON student_activity_log
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- analytics_dashboards (refs auth.users)
DROP POLICY IF EXISTS "Staff can manage dashboards" ON analytics_dashboards;
CREATE POLICY "Staff can manage dashboards" ON analytics_dashboards
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- analytics_reports (refs auth.users)
DROP POLICY IF EXISTS "Staff can manage analytics reports" ON analytics_reports;
CREATE POLICY "Staff can manage analytics reports" ON analytics_reports
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- analytics_metrics
DROP POLICY IF EXISTS "Staff can view analytics metrics" ON analytics_metrics;
CREATE POLICY "Staff can view analytics metrics" ON analytics_metrics
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- student_risk_scores
DROP POLICY IF EXISTS "Students see own risk scores" ON student_risk_scores;
CREATE POLICY "Students see own risk scores" ON student_risk_scores
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage risk scores" ON student_risk_scores;
CREATE POLICY "Staff can manage risk scores" ON student_risk_scores
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- custom_reports
DROP POLICY IF EXISTS "View accessible reports" ON custom_reports;
CREATE POLICY "View accessible reports" ON custom_reports
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR is_template = true OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Users manage own reports" ON custom_reports;
CREATE POLICY "Users manage own reports" ON custom_reports
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- report_schedules (no user ownership column — admin-only)
DROP POLICY IF EXISTS "Admin manage report schedules" ON report_schedules;
CREATE POLICY "Admin manage report schedules" ON report_schedules
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- ai_insights
DROP POLICY IF EXISTS "Staff can view AI insights" ON ai_insights;
CREATE POLICY "Staff can view AI insights" ON ai_insights
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

DROP POLICY IF EXISTS "Staff can manage AI insights" ON ai_insights;
CREATE POLICY "Staff can manage AI insights" ON ai_insights
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin'))
  );


-- ============================================================================
-- LEARNING PATHS & COMPETENCIES (007)
-- ============================================================================

-- learning_paths (has is_global)
DROP POLICY IF EXISTS "View published learning paths" ON learning_paths;
CREATE POLICY "View published learning paths" ON learning_paths
  FOR SELECT USING (
    (tenant_id = current_tenant_id() OR is_global = true) AND (
      published = true OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage learning paths" ON learning_paths;
CREATE POLICY "Staff can manage learning paths" ON learning_paths
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- learning_path_courses
DROP POLICY IF EXISTS "View learning path courses" ON learning_path_courses;
CREATE POLICY "View learning path courses" ON learning_path_courses
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage learning path courses" ON learning_path_courses;
CREATE POLICY "Staff can manage learning path courses" ON learning_path_courses
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- learning_path_enrollments
DROP POLICY IF EXISTS "Users see own path enrollments" ON learning_path_enrollments;
CREATE POLICY "Users see own path enrollments" ON learning_path_enrollments
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Users can self-enroll in paths" ON learning_path_enrollments;
CREATE POLICY "Users can self-enroll in paths" ON learning_path_enrollments
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND student_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage path enrollments" ON learning_path_enrollments;
CREATE POLICY "Admin can manage path enrollments" ON learning_path_enrollments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- competencies (has is_global)
DROP POLICY IF EXISTS "Anyone can view competencies" ON competencies;
CREATE POLICY "Anyone can view competencies" ON competencies
  FOR SELECT USING (tenant_id = current_tenant_id() OR is_global = true);

DROP POLICY IF EXISTS "Staff can manage competencies" ON competencies;
CREATE POLICY "Staff can manage competencies" ON competencies
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'curriculum_designer'))
  );

-- course_competencies
DROP POLICY IF EXISTS "View course competencies" ON course_competencies;
CREATE POLICY "View course competencies" ON course_competencies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage course competencies" ON course_competencies;
CREATE POLICY "Staff can manage course competencies" ON course_competencies
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- lesson_competencies
DROP POLICY IF EXISTS "View lesson competencies" ON lesson_competencies;
CREATE POLICY "View lesson competencies" ON lesson_competencies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage lesson competencies" ON lesson_competencies;
CREATE POLICY "Staff can manage lesson competencies" ON lesson_competencies
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
  );

-- student_competencies
DROP POLICY IF EXISTS "Users see own competencies" ON student_competencies;
CREATE POLICY "Users see own competencies" ON student_competencies
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "System can manage student competencies" ON student_competencies;
CREATE POLICY "System can manage student competencies" ON student_competencies
  FOR ALL USING (tenant_id = current_tenant_id());

-- adaptive_rules
DROP POLICY IF EXISTS "View active adaptive rules" ON adaptive_rules;
CREATE POLICY "View active adaptive rules" ON adaptive_rules
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      is_active = true OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage adaptive rules" ON adaptive_rules;
CREATE POLICY "Staff can manage adaptive rules" ON adaptive_rules
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- student_adaptive_recommendations
DROP POLICY IF EXISTS "Users see own recommendations" ON student_adaptive_recommendations;
CREATE POLICY "Users see own recommendations" ON student_adaptive_recommendations
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Users can update own recommendations" ON student_adaptive_recommendations;
CREATE POLICY "Users can update own recommendations" ON student_adaptive_recommendations
  FOR UPDATE USING (tenant_id = current_tenant_id() AND student_id = auth.uid());

DROP POLICY IF EXISTS "System can manage recommendations" ON student_adaptive_recommendations;
CREATE POLICY "System can manage recommendations" ON student_adaptive_recommendations
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin'))
  );


-- ============================================================================
-- STUDENT EXPERIENCE (007)
-- ============================================================================

-- student_notes
DROP POLICY IF EXISTS "Users manage own notes" ON student_notes;
CREATE POLICY "Users manage own notes" ON student_notes
  FOR ALL USING (tenant_id = current_tenant_id() AND student_id = auth.uid());

-- student_bookmarks
DROP POLICY IF EXISTS "Users manage own bookmarks" ON student_bookmarks;
CREATE POLICY "Users manage own bookmarks" ON student_bookmarks
  FOR ALL USING (tenant_id = current_tenant_id() AND student_id = auth.uid());

-- student_calendar_events
DROP POLICY IF EXISTS "Users manage own calendar events" ON student_calendar_events;
CREATE POLICY "Users manage own calendar events" ON student_calendar_events
  FOR ALL USING (tenant_id = current_tenant_id() AND student_id = auth.uid());

-- student_todos
DROP POLICY IF EXISTS "Users manage own todos" ON student_todos;
CREATE POLICY "Users manage own todos" ON student_todos
  FOR ALL USING (tenant_id = current_tenant_id() AND student_id = auth.uid());

-- study_groups
DROP POLICY IF EXISTS "View study groups in tenant" ON study_groups;
CREATE POLICY "View study groups in tenant" ON study_groups
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Members can manage study groups" ON study_groups;
CREATE POLICY "Members can manage study groups" ON study_groups
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- study_group_members
DROP POLICY IF EXISTS "View study group members" ON study_group_members;
CREATE POLICY "View study group members" ON study_group_members
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Manage study group members" ON study_group_members;
CREATE POLICY "Manage study group members" ON study_group_members
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- study_group_messages
DROP POLICY IF EXISTS "Members view group messages" ON study_group_messages;
CREATE POLICY "Members view group messages" ON study_group_messages
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Members can send messages" ON study_group_messages;
CREATE POLICY "Members can send messages" ON study_group_messages
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND sender_id = auth.uid());

DROP POLICY IF EXISTS "Authors manage own messages" ON study_group_messages;
CREATE POLICY "Authors manage own messages" ON study_group_messages
  FOR ALL USING (tenant_id = current_tenant_id() AND sender_id = auth.uid());

-- study_group_events
DROP POLICY IF EXISTS "View study group events" ON study_group_events;
CREATE POLICY "View study group events" ON study_group_events
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Manage study group events" ON study_group_events;
CREATE POLICY "Manage study group events" ON study_group_events
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

-- student_study_sessions
DROP POLICY IF EXISTS "Users manage own study sessions" ON student_study_sessions;
CREATE POLICY "Users manage own study sessions" ON student_study_sessions
  FOR ALL USING (tenant_id = current_tenant_id() AND student_id = auth.uid());


-- ============================================================================
-- SURVEYS (008)
-- ============================================================================

-- surveys
DROP POLICY IF EXISTS "View published surveys" ON surveys;
CREATE POLICY "View published surveys" ON surveys
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      published = true OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage surveys" ON surveys;
CREATE POLICY "Staff can manage surveys" ON surveys
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- survey_questions
DROP POLICY IF EXISTS "View survey questions" ON survey_questions;
CREATE POLICY "View survey questions" ON survey_questions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage survey questions" ON survey_questions;
CREATE POLICY "Staff can manage survey questions" ON survey_questions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- survey_responses
DROP POLICY IF EXISTS "Users see own survey responses" ON survey_responses;
CREATE POLICY "Users see own survey responses" ON survey_responses
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      respondent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Users can submit survey responses" ON survey_responses;
CREATE POLICY "Users can submit survey responses" ON survey_responses
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND respondent_id = auth.uid());

-- survey_analytics
DROP POLICY IF EXISTS "Staff can view survey analytics" ON survey_analytics;
CREATE POLICY "Staff can view survey analytics" ON survey_analytics
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- survey_templates
DROP POLICY IF EXISTS "View survey templates" ON survey_templates;
CREATE POLICY "View survey templates" ON survey_templates
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage survey templates" ON survey_templates;
CREATE POLICY "Staff can manage survey templates" ON survey_templates
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );


-- ============================================================================
-- CATEGORIES (008, has is_global)
-- ============================================================================

-- course_categories (has is_global)
DROP POLICY IF EXISTS "View course categories" ON course_categories;
CREATE POLICY "View course categories" ON course_categories
  FOR SELECT USING (tenant_id = current_tenant_id() OR is_global = true);

DROP POLICY IF EXISTS "Staff can manage course categories" ON course_categories;
CREATE POLICY "Staff can manage course categories" ON course_categories
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'curriculum_designer'))
  );

-- course_category_assignments
DROP POLICY IF EXISTS "View category assignments" ON course_category_assignments;
CREATE POLICY "View category assignments" ON course_category_assignments
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage category assignments" ON course_category_assignments;
CREATE POLICY "Staff can manage category assignments" ON course_category_assignments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'curriculum_designer'))
  );


-- ============================================================================
-- I18N & ACCESSIBILITY (008)
-- ============================================================================

-- translations
DROP POLICY IF EXISTS "Anyone can view translations" ON translations;
CREATE POLICY "Anyone can view translations" ON translations
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage translations" ON translations;
CREATE POLICY "Staff can manage translations" ON translations
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- supported_locales
DROP POLICY IF EXISTS "Anyone can view supported locales" ON supported_locales;
CREATE POLICY "Anyone can view supported locales" ON supported_locales
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage locales" ON supported_locales;
CREATE POLICY "Admin can manage locales" ON supported_locales
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- accessibility_reports
DROP POLICY IF EXISTS "Staff can manage accessibility reports" ON accessibility_reports;
CREATE POLICY "Staff can manage accessibility reports" ON accessibility_reports
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- video_captions
DROP POLICY IF EXISTS "View video captions" ON video_captions;
CREATE POLICY "View video captions" ON video_captions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage video captions" ON video_captions;
CREATE POLICY "Staff can manage video captions" ON video_captions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- accessibility_preferences
DROP POLICY IF EXISTS "Users manage own accessibility prefs" ON accessibility_preferences;
CREATE POLICY "Users manage own accessibility prefs" ON accessibility_preferences
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());


-- ============================================================================
-- PROGRAMMES (008, has is_global)
-- ============================================================================

-- programmes (has is_global)
DROP POLICY IF EXISTS "Published programmes visible" ON programmes;
CREATE POLICY "Published programmes visible" ON programmes
  FOR SELECT USING (
    (tenant_id = current_tenant_id() OR is_global = true) AND (
      published = true OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
    )
  );

DROP POLICY IF EXISTS "Staff can manage programmes" ON programmes;
CREATE POLICY "Staff can manage programmes" ON programmes
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'curriculum_designer'))
  );

-- programme_courses
DROP POLICY IF EXISTS "View programme courses" ON programme_courses;
CREATE POLICY "View programme courses" ON programme_courses
  FOR SELECT USING (
    tenant_id = current_tenant_id() OR
    EXISTS (SELECT 1 FROM programmes WHERE programmes.id = programme_courses.programme_id AND programmes.is_global = true)
  );

DROP POLICY IF EXISTS "Staff can manage programme courses" ON programme_courses;
CREATE POLICY "Staff can manage programme courses" ON programme_courses
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'curriculum_designer'))
  );

-- programme_enrollments
DROP POLICY IF EXISTS "Students see own programme enrollments" ON programme_enrollments;
CREATE POLICY "Students see own programme enrollments" ON programme_enrollments
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'))
    )
  );

DROP POLICY IF EXISTS "Students can self-enroll in programmes" ON programme_enrollments;
CREATE POLICY "Students can self-enroll in programmes" ON programme_enrollments
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND student_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage programme enrollments" ON programme_enrollments;
CREATE POLICY "Admin can manage programme enrollments" ON programme_enrollments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );


-- ============================================================================
-- ADMISSIONS (008)
-- ============================================================================

-- admission_forms
DROP POLICY IF EXISTS "View published admission forms" ON admission_forms;
CREATE POLICY "View published admission forms" ON admission_forms
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      status = 'published' OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Admin can manage admission forms" ON admission_forms;
CREATE POLICY "Admin can manage admission forms" ON admission_forms
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- admission_form_fields
DROP POLICY IF EXISTS "View admission form fields" ON admission_form_fields;
CREATE POLICY "View admission form fields" ON admission_form_fields
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage form fields" ON admission_form_fields;
CREATE POLICY "Admin can manage form fields" ON admission_form_fields
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- admission_applications (uses user_id for linked user account)
DROP POLICY IF EXISTS "Applicants see own applications" ON admission_applications;
CREATE POLICY "Applicants see own applications" ON admission_applications
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Applicants can submit applications" ON admission_applications;
CREATE POLICY "Applicants can submit applications" ON admission_applications
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Admin can manage applications" ON admission_applications;
CREATE POLICY "Admin can manage applications" ON admission_applications
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- admission_documents (no user column — access via application ownership)
DROP POLICY IF EXISTS "View own admission documents" ON admission_documents;
CREATE POLICY "View own admission documents" ON admission_documents
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      EXISTS (SELECT 1 FROM admission_applications WHERE admission_applications.id = admission_documents.application_id AND admission_applications.user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Applicants can upload documents" ON admission_documents;
CREATE POLICY "Applicants can upload documents" ON admission_documents
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM admission_applications WHERE admission_applications.id = admission_documents.application_id AND admission_applications.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can manage documents" ON admission_documents;
CREATE POLICY "Admin can manage documents" ON admission_documents
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- admission_reviews
DROP POLICY IF EXISTS "Staff can manage admission reviews" ON admission_reviews;
CREATE POLICY "Staff can manage admission reviews" ON admission_reviews
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );


-- ============================================================================
-- CRM (009)
-- ============================================================================

-- crm_student_lifecycle
DROP POLICY IF EXISTS "Staff see lifecycle in tenant" ON crm_student_lifecycle;
CREATE POLICY "Staff see lifecycle in tenant" ON crm_student_lifecycle
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

DROP POLICY IF EXISTS "Students see own lifecycle" ON crm_student_lifecycle;
CREATE POLICY "Students see own lifecycle" ON crm_student_lifecycle
  FOR SELECT USING (tenant_id = current_tenant_id() AND student_id = auth.uid());

-- crm_interactions
DROP POLICY IF EXISTS "Staff see interactions" ON crm_interactions;
CREATE POLICY "Staff see interactions" ON crm_interactions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

DROP POLICY IF EXISTS "Students see own non-private interactions" ON crm_interactions;
CREATE POLICY "Students see own non-private interactions" ON crm_interactions
  FOR SELECT USING (tenant_id = current_tenant_id() AND student_id = auth.uid() AND is_private = false);

-- crm_engagement_config
DROP POLICY IF EXISTS "Admin manage engagement config" ON crm_engagement_config;
CREATE POLICY "Admin manage engagement config" ON crm_engagement_config
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- crm_engagement_scores
DROP POLICY IF EXISTS "View engagement scores" ON crm_engagement_scores;
CREATE POLICY "View engagement scores" ON crm_engagement_scores
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff manage engagement scores" ON crm_engagement_scores;
CREATE POLICY "Staff manage engagement scores" ON crm_engagement_scores
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- crm_segments
DROP POLICY IF EXISTS "View segments" ON crm_segments;
CREATE POLICY "View segments" ON crm_segments
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      created_by = auth.uid() OR is_shared = true OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- crm_segment_members
DROP POLICY IF EXISTS "Staff view segment members" ON crm_segment_members;
CREATE POLICY "Staff view segment members" ON crm_segment_members
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

DROP POLICY IF EXISTS "Admin manage segment members" ON crm_segment_members;
CREATE POLICY "Admin manage segment members" ON crm_segment_members
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- crm_campaigns
DROP POLICY IF EXISTS "Staff manage campaigns" ON crm_campaigns;
CREATE POLICY "Staff manage campaigns" ON crm_campaigns
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- crm_campaign_recipients
DROP POLICY IF EXISTS "Staff view campaign recipients" ON crm_campaign_recipients;
CREATE POLICY "Staff view campaign recipients" ON crm_campaign_recipients
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- crm_tasks
DROP POLICY IF EXISTS "Access own or assigned tasks" ON crm_tasks;
CREATE POLICY "Access own or assigned tasks" ON crm_tasks
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      assigned_to = auth.uid() OR created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- crm_workflows
DROP POLICY IF EXISTS "Admin manage workflows" ON crm_workflows;
CREATE POLICY "Admin manage workflows" ON crm_workflows
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- crm_workflow_executions
DROP POLICY IF EXISTS "Admin view workflow executions" ON crm_workflow_executions;
CREATE POLICY "Admin view workflow executions" ON crm_workflow_executions
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- programme_application_fields
DROP POLICY IF EXISTS "Anyone can view application fields" ON programme_application_fields;
CREATE POLICY "Anyone can view application fields" ON programme_application_fields
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage application fields" ON programme_application_fields;
CREATE POLICY "Staff can manage application fields" ON programme_application_fields
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

-- programme_applications
DROP POLICY IF EXISTS "Staff manage programme applications" ON programme_applications;
CREATE POLICY "Staff manage programme applications" ON programme_applications
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
  );

DROP POLICY IF EXISTS "Applicants see own programme applications" ON programme_applications;
CREATE POLICY "Applicants see own programme applications" ON programme_applications
  FOR SELECT USING (tenant_id = current_tenant_id() AND applicant_id = auth.uid());

DROP POLICY IF EXISTS "Applicants can submit programme applications" ON programme_applications;
CREATE POLICY "Applicants can submit programme applications" ON programme_applications
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND applicant_id = auth.uid());


-- ============================================================================
-- GLOBAL DISCUSSIONS (010, has is_global on categories)
-- ============================================================================

-- global_discussion_categories (has is_global)
DROP POLICY IF EXISTS "View active global discussion categories" ON global_discussion_categories;
CREATE POLICY "View active global discussion categories" ON global_discussion_categories
  FOR SELECT USING (
    (tenant_id = current_tenant_id() OR is_global = true) AND is_active = true
  );

DROP POLICY IF EXISTS "Admin can manage global discussion categories" ON global_discussion_categories;
CREATE POLICY "Admin can manage global discussion categories" ON global_discussion_categories
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- global_discussions
DROP POLICY IF EXISTS "View global discussions in tenant" ON global_discussions;
CREATE POLICY "View global discussions in tenant" ON global_discussions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Authenticated can create global discussions" ON global_discussions;
CREATE POLICY "Authenticated can create global discussions" ON global_discussions
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors and admin manage global discussions" ON global_discussions;
CREATE POLICY "Authors and admin manage global discussions" ON global_discussions
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND (
      auth.uid() = author_id OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Authors and admin delete global discussions" ON global_discussions;
CREATE POLICY "Authors and admin delete global discussions" ON global_discussions
  FOR DELETE USING (
    tenant_id = current_tenant_id() AND (
      auth.uid() = author_id OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- global_discussion_replies
DROP POLICY IF EXISTS "View visible global replies" ON global_discussion_replies;
CREATE POLICY "View visible global replies" ON global_discussion_replies
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      is_hidden = false OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Authenticated can reply to global discussions" ON global_discussion_replies;
CREATE POLICY "Authenticated can reply to global discussions" ON global_discussion_replies
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND
    auth.uid() = author_id AND
    NOT EXISTS (
      SELECT 1 FROM global_discussions WHERE id = discussion_id AND is_locked = true
    )
  );

DROP POLICY IF EXISTS "Authors and admin manage global replies" ON global_discussion_replies;
CREATE POLICY "Authors and admin manage global replies" ON global_discussion_replies
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND (
      auth.uid() = author_id OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Authors and admin delete global replies" ON global_discussion_replies;
CREATE POLICY "Authors and admin delete global replies" ON global_discussion_replies
  FOR DELETE USING (
    tenant_id = current_tenant_id() AND (
      auth.uid() = author_id OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- global_discussion_votes
DROP POLICY IF EXISTS "View global discussion votes" ON global_discussion_votes;
CREATE POLICY "View global discussion votes" ON global_discussion_votes
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Users manage own global discussion votes" ON global_discussion_votes;
CREATE POLICY "Users manage own global discussion votes" ON global_discussion_votes
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- global_discussion_subscriptions
DROP POLICY IF EXISTS "Users manage own global subscriptions" ON global_discussion_subscriptions;
CREATE POLICY "Users manage own global subscriptions" ON global_discussion_subscriptions
  FOR ALL USING (tenant_id = current_tenant_id() AND user_id = auth.uid());


-- ============================================================================
-- ADVANCED ANALYTICS & OMNICHANNEL (010)
-- ============================================================================

-- data_warehouse_configs
DROP POLICY IF EXISTS "Admin manage data warehouse configs" ON data_warehouse_configs;
CREATE POLICY "Admin manage data warehouse configs" ON data_warehouse_configs
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- etl_pipeline_jobs
DROP POLICY IF EXISTS "Admin manage ETL jobs" ON etl_pipeline_jobs;
CREATE POLICY "Admin manage ETL jobs" ON etl_pipeline_jobs
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- etl_pipeline_schedules
DROP POLICY IF EXISTS "Admin manage ETL schedules" ON etl_pipeline_schedules;
CREATE POLICY "Admin manage ETL schedules" ON etl_pipeline_schedules
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- student_risk_indicators
DROP POLICY IF EXISTS "View risk indicators" ON student_risk_indicators;
CREATE POLICY "View risk indicators" ON student_risk_indicators
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff manage risk indicators" ON student_risk_indicators;
CREATE POLICY "Staff manage risk indicators" ON student_risk_indicators
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- learning_analytics_models
DROP POLICY IF EXISTS "Admin manage analytics models" ON learning_analytics_models;
CREATE POLICY "Admin manage analytics models" ON learning_analytics_models
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- learning_analytics_predictions
DROP POLICY IF EXISTS "View analytics predictions" ON learning_analytics_predictions;
CREATE POLICY "View analytics predictions" ON learning_analytics_predictions
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff manage analytics predictions" ON learning_analytics_predictions;
CREATE POLICY "Staff manage analytics predictions" ON learning_analytics_predictions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- engagement_metrics
DROP POLICY IF EXISTS "View engagement metrics" ON engagement_metrics;
CREATE POLICY "View engagement metrics" ON engagement_metrics
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff manage engagement metrics" ON engagement_metrics;
CREATE POLICY "Staff manage engagement metrics" ON engagement_metrics
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- custom_report_executions
DROP POLICY IF EXISTS "View report executions" ON custom_report_executions;
CREATE POLICY "View report executions" ON custom_report_executions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND (
      executed_by = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

-- notification_channels
DROP POLICY IF EXISTS "Admin manage notification channels" ON notification_channels;
CREATE POLICY "Admin manage notification channels" ON notification_channels
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- omnichannel_notifications
DROP POLICY IF EXISTS "Users see own omnichannel notifications" ON omnichannel_notifications;
CREATE POLICY "Users see own omnichannel notifications" ON omnichannel_notifications
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Staff manage omnichannel notifications" ON omnichannel_notifications;
CREATE POLICY "Staff manage omnichannel notifications" ON omnichannel_notifications
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- sms_notifications
DROP POLICY IF EXISTS "Users see own SMS notifications" ON sms_notifications;
CREATE POLICY "Users see own SMS notifications" ON sms_notifications
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Staff manage SMS notifications" ON sms_notifications;
CREATE POLICY "Staff manage SMS notifications" ON sms_notifications
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- whatsapp_notifications
DROP POLICY IF EXISTS "Users see own WhatsApp notifications" ON whatsapp_notifications;
CREATE POLICY "Users see own WhatsApp notifications" ON whatsapp_notifications
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Staff manage WhatsApp notifications" ON whatsapp_notifications;
CREATE POLICY "Staff manage WhatsApp notifications" ON whatsapp_notifications
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- push_notifications
DROP POLICY IF EXISTS "Users see own push notifications" ON push_notifications;
CREATE POLICY "Users see own push notifications" ON push_notifications
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Staff manage push notifications" ON push_notifications;
CREATE POLICY "Staff manage push notifications" ON push_notifications
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );

-- global_announcements
DROP POLICY IF EXISTS "View active global announcements" ON global_announcements;
CREATE POLICY "View active global announcements" ON global_announcements
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    is_active = true AND
    (start_date IS NULL OR start_date <= now()) AND
    (end_date IS NULL OR end_date >= now()) AND
    (
      array_length(target_roles, 1) IS NULL OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = ANY(target_roles)
      )
    )
  );

DROP POLICY IF EXISTS "Admin manage global announcements" ON global_announcements;
CREATE POLICY "Admin manage global announcements" ON global_announcements
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'tenant_admin', 'admin'))
  );


-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
