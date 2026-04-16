-- ============================================================================
-- Part 26: Performance Indexes
-- ============================================================================
-- Adds missing indexes identified by API route query analysis.
-- Safe to run multiple times (IF NOT EXISTS on all).
-- ============================================================================

-- ============================================================================
-- PHASE 1 — High-traffic tables (progress, grading, enrollments)
-- ============================================================================

-- lesson_progress: core progress queries filter on lesson_id and (student_id, lesson_id)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_lesson ON lesson_progress(student_id, lesson_id);

-- content_item_progress: content tracking
CREATE INDEX IF NOT EXISTS idx_content_item_progress_lesson ON content_item_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_item_progress_student_lesson ON content_item_progress(student_id, lesson_id);

-- quiz_attempts: grading lookups always filter by (quiz_id, student_id)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student ON quiz_attempts(quiz_id, student_id);

-- assignment_submissions: grade filtering by assignment + student + status
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assign_student_status ON assignment_submissions(assignment_id, student_id, status);

-- enrollments: the common "my enrollments" query filters (student_id, status)
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status ON enrollments(student_id, status);

-- discussion_replies: threaded discussion queries
CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_author ON discussion_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_parent ON discussion_replies(parent_reply_id);

-- lesson_discussion_replies: same pattern
CREATE INDEX IF NOT EXISTS idx_lesson_discussion_replies_parent ON lesson_discussion_replies(parent_reply_id);

-- course filtering/search columns
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_subject_area ON courses(subject_area);
CREATE INDEX IF NOT EXISTS idx_courses_grade_level ON courses(grade_level);

-- course_grades: student grade lookup
CREATE INDEX IF NOT EXISTS idx_course_grades_student_course ON course_grades(student_id, course_id);

-- RLS policy support: whiteboards visibility checks need these
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course ON enrollments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor_course ON course_instructors(instructor_id, course_id);

-- ============================================================================
-- PHASE 2 — CRM, analytics, cohorts
-- ============================================================================

-- CRM tables
CREATE INDEX IF NOT EXISTS idx_crm_student_lifecycle_student ON crm_student_lifecycle(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_student_date ON crm_interactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_student ON crm_engagement_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_segment_user ON crm_segment_members(segment_id, user_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_learning_analytics_predictions_student ON learning_analytics_predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_student ON engagement_metrics(student_id);

-- Cohorts
CREATE INDEX IF NOT EXISTS idx_cohort_facilitators_cohort_role ON cohort_facilitators(cohort_id, role);
CREATE INDEX IF NOT EXISTS idx_cohort_content_overrides_lesson ON cohort_content_overrides(lesson_id);

-- Cross-tenant tables
CREATE INDEX IF NOT EXISTS idx_cte_source_tenant_student ON cross_tenant_enrollments(source_tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_ctlp_lesson_student ON cross_tenant_lesson_progress(lesson_id, student_id);
CREATE INDEX IF NOT EXISTS idx_ctg_student_assessment ON cross_tenant_grades(student_id, assessment_type);

-- Gamification & AI
CREATE INDEX IF NOT EXISTS idx_gamification_xp_ledger_user_course ON gamification_xp_ledger(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_analytics_student_course ON ai_tutor_analytics(student_id, course_id);
