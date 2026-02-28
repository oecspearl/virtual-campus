-- ============================================================================
-- OECS Learning Hub - Database Schema
-- ============================================================================
-- This script creates all tables for the LMS Enterprise application
-- Tables are ordered to respect foreign key dependencies
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES (No dependencies)
-- ============================================================================

-- Users table (referenced by many other tables)
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'admin'::character varying, 'instructor'::character varying, 'curriculum_designer'::character varying, 'student'::character varying, 'parent'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  gender character varying CHECK (gender::text = ANY (ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying, 'prefer_not_to_say'::character varying]::text[])),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Courses table (referenced by many other tables)
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  thumbnail character varying,
  grade_level character varying,
  subject_area character varying,
  difficulty character varying DEFAULT 'beginner'::character varying CHECK (difficulty::text = ANY (ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying]::text[])),
  syllabus text,
  published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  featured boolean DEFAULT false,
  ceu_credits numeric DEFAULT 0,
  credit_type character varying DEFAULT 'CEU'::character varying,
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- USER-RELATED TABLES
-- ============================================================================

-- User profiles
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE,
  bio text,
  avatar character varying,
  learning_preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Gamification profiles
CREATE TABLE public.gamification_profiles (
  user_id uuid NOT NULL,
  xp_total bigint NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_count integer NOT NULL DEFAULT 0,
  last_active_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gamification_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT gamification_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Gamification XP ledger
CREATE TABLE public.gamification_xp_ledger (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_id text,
  course_id uuid,
  lesson_id uuid,
  xp_delta integer NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gamification_xp_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT gamification_xp_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Transcripts
CREATE TABLE public.transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  pdf_url text,
  course_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_credits numeric DEFAULT 0,
  gpa numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT transcripts_pkey PRIMARY KEY (id),
  CONSTRAINT transcripts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id)
);

-- In-app notifications
CREATE TABLE public.in_app_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  link_url text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT in_app_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- AI-RELATED TABLES (auth.users references)
-- ============================================================================

-- AI context cache
CREATE TABLE public.ai_context_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  context_key character varying NOT NULL,
  context_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_context_cache_pkey PRIMARY KEY (id),
  CONSTRAINT ai_context_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- AI conversations
CREATE TABLE public.ai_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying NOT NULL DEFAULT 'New Conversation'::character varying,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- AI messages
CREATE TABLE public.ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying]::text[])),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id)
);

-- AI usage tracking
CREATE TABLE public.ai_usage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_calls integer DEFAULT 0,
  tokens_used integer DEFAULT 0,
  cost_usd numeric DEFAULT 0.00,
  date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_usage_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT ai_usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  preferences jsonb DEFAULT '{"grade_posted": {"email": true, "in_app": true}, "discussion_reply": {"email": true, "in_app": true}, "course_enrollment": {"email": true, "in_app": true}, "discussion_mention": {"email": true, "in_app": true}, "course_announcement": {"email": true, "in_app": true}, "assignment_due_reminder": {"email": true, "in_app": true, "days_before": 1}, "enrollment_confirmation": {"email": true, "in_app": true}}'::jsonb,
  quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
  quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
  digest_frequency character varying DEFAULT 'daily'::character varying CHECK (digest_frequency::text = ANY (ARRAY['none'::character varying, 'daily'::character varying, 'weekly'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Email notifications
CREATE TABLE public.email_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL,
  subject character varying NOT NULL,
  body_text text,
  body_html text,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying, 'bounced'::character varying]::text[])),
  sent_at timestamp with time zone,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT email_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Email digests
CREATE TABLE public.email_digests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  digest_type character varying NOT NULL CHECK (digest_type::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying]::text[])),
  notification_ids uuid[] DEFAULT '{}'::uuid[],
  subject character varying NOT NULL,
  body_html text NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying]::text[])),
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_digests_pkey PRIMARY KEY (id),
  CONSTRAINT email_digests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Email templates
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  type character varying NOT NULL,
  subject_template text NOT NULL,
  body_html_template text NOT NULL,
  body_text_template text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id)
);

-- Student activity log
CREATE TABLE public.student_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid,
  activity_type text NOT NULL,
  item_id uuid,
  item_type text,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT student_activity_log_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id),
  CONSTRAINT student_activity_log_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Analytics dashboards
CREATE TABLE public.analytics_dashboards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL,
  is_shared boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT analytics_dashboards_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_dashboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Analytics reports
CREATE TABLE public.analytics_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  report_type text NOT NULL,
  config jsonb NOT NULL,
  schedule jsonb,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT analytics_reports_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Analytics metrics
CREATE TABLE public.analytics_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_date date NOT NULL,
  metric_value jsonb NOT NULL,
  dimensions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT analytics_metrics_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- COURSE STRUCTURE TABLES
-- ============================================================================

-- Subjects (course modules/units)
CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid,
  title character varying NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  estimated_duration character varying,
  learning_objectives text[],
  published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id),
  CONSTRAINT subjects_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Lessons
CREATE TABLE public.lessons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  subject_id uuid,
  title character varying NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  learning_outcomes text[],
  lesson_instructions text,
  content jsonb DEFAULT '[]'::jsonb,
  resources jsonb DEFAULT '[]'::jsonb,
  estimated_time integer DEFAULT 0,
  difficulty integer DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  course_id uuid,
  content_type character varying DEFAULT 'rich_text'::character varying CHECK (content_type::text = ANY (ARRAY['rich_text'::character varying, 'video'::character varying, 'scorm'::character varying, 'quiz'::character varying, 'assignment'::character varying]::text[])),
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Course instructors
CREATE TABLE public.course_instructors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid,
  instructor_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_instructors_pkey PRIMARY KEY (id),
  CONSTRAINT course_instructors_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_instructors_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
);

-- Classes
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid,
  name character varying NOT NULL,
  section character varying,
  term character varying,
  schedule jsonb DEFAULT '{}'::jsonb,
  max_enrollment integer,
  enrollment_code character varying UNIQUE,
  enrollment_open boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Class instructors
CREATE TABLE public.class_instructors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid,
  instructor_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_instructors_pkey PRIMARY KEY (id),
  CONSTRAINT class_instructors_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_instructors_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
);

-- Class students
CREATE TABLE public.class_students (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid,
  student_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_students_pkey PRIMARY KEY (id),
  CONSTRAINT class_students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id)
);

-- Enrollments
CREATE TABLE public.enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid,
  student_id uuid,
  enrolled_at timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'dropped'::character varying, 'completed'::character varying]::text[])),
  updated_at timestamp with time zone DEFAULT now(),
  course_id uuid,
  progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at timestamp with time zone,
  student_name character varying,
  student_email character varying,
  student_role character varying,
  student_bio text,
  student_avatar character varying,
  learning_preferences jsonb DEFAULT '{}'::jsonb,
  user_created_at timestamp with time zone,
  profile_created_at timestamp with time zone,
  student_gender character varying,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- ============================================================================
-- ASSESSMENT TABLES
-- ============================================================================

-- Quizzes
CREATE TABLE public.quizzes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lesson_id uuid,
  title character varying NOT NULL,
  description text,
  instructions text,
  time_limit integer,
  attempts_allowed integer DEFAULT 1,
  show_correct_answers boolean DEFAULT false,
  show_feedback character varying DEFAULT 'after_submit'::character varying CHECK (show_feedback::text = ANY (ARRAY['immediately'::character varying, 'after_submit'::character varying, 'never'::character varying]::text[])),
  randomize_questions boolean DEFAULT false,
  randomize_answers boolean DEFAULT false,
  passing_score integer,
  due_date timestamp with time zone,
  available_from timestamp with time zone,
  available_until timestamp with time zone,
  points integer DEFAULT 0,
  published boolean DEFAULT false,
  creator_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  course_id uuid,
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT quizzes_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id),
  CONSTRAINT quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Questions
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quiz_id uuid,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['multiple_choice'::character varying, 'true_false'::character varying, 'short_answer'::character varying, 'essay'::character varying, 'fill_blank'::character varying, 'matching'::character varying]::text[])),
  question_text text NOT NULL,
  points integer DEFAULT 1,
  "order" integer DEFAULT 0,
  options jsonb,
  correct_answer jsonb,
  case_sensitive boolean DEFAULT false,
  feedback_correct text,
  feedback_incorrect text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id)
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quiz_id uuid,
  student_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  answers jsonb DEFAULT '[]'::jsonb,
  score integer,
  max_score integer,
  percentage numeric,
  time_taken integer,
  status character varying DEFAULT 'in_progress'::character varying CHECK (status::text = ANY (ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  course_id uuid,
  attempt_number integer NOT NULL DEFAULT 1,
  CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id),
  CONSTRAINT quiz_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT quiz_attempts_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Assignments
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lesson_id uuid,
  class_id uuid,
  title character varying NOT NULL,
  description text,
  due_date timestamp with time zone,
  points integer DEFAULT 100,
  submission_types text[] DEFAULT ARRAY['file'::text],
  file_types_allowed text[],
  max_file_size integer DEFAULT 50,
  rubric jsonb DEFAULT '[]'::jsonb,
  allow_late_submissions boolean DEFAULT true,
  late_penalty integer,
  published boolean DEFAULT false,
  creator_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  course_id uuid,
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT assignments_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id),
  CONSTRAINT assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Assignment submissions
CREATE TABLE public.assignment_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id uuid,
  student_id uuid,
  submitted_at timestamp with time zone,
  submission_type character varying NOT NULL CHECK (submission_type::text = ANY (ARRAY['file'::character varying, 'text'::character varying, 'url'::character varying]::text[])),
  content text,
  files jsonb,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'submitted'::character varying, 'graded'::character varying]::text[])),
  grade integer,
  feedback text,
  rubric_scores jsonb,
  graded_by uuid,
  graded_at timestamp with time zone,
  late boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id),
  CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT assignment_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id)
);

-- ============================================================================
-- GRADING TABLES
-- ============================================================================

-- Course gradebook settings
CREATE TABLE public.course_gradebook_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE,
  grading_scheme character varying DEFAULT 'points'::character varying CHECK (grading_scheme::text = ANY (ARRAY['points'::character varying, 'percentage'::character varying, 'letter'::character varying]::text[])),
  categories jsonb DEFAULT '[]'::jsonb,
  total_points integer DEFAULT 1000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_gradebook_settings_pkey PRIMARY KEY (id),
  CONSTRAINT course_gradebook_settings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Course grade items
CREATE TABLE public.course_grade_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['quiz'::character varying, 'assignment'::character varying, 'other'::character varying]::text[])),
  category character varying NOT NULL,
  points integer NOT NULL,
  assessment_id uuid,
  due_date timestamp with time zone,
  weight numeric DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT course_grade_items_pkey PRIMARY KEY (id),
  CONSTRAINT course_grade_items_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Course grades
CREATE TABLE public.course_grades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  student_id uuid NOT NULL,
  grade_item_id uuid NOT NULL,
  score integer NOT NULL,
  max_score integer NOT NULL,
  percentage numeric NOT NULL,
  feedback text,
  graded_by uuid,
  graded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_grades_pkey PRIMARY KEY (id),
  CONSTRAINT course_grades_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT course_grades_grade_item_id_fkey FOREIGN KEY (grade_item_id) REFERENCES public.course_grade_items(id),
  CONSTRAINT course_grades_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id)
);

-- Grade items (class-level)
CREATE TABLE public.grade_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid,
  title character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['quiz'::character varying, 'assignment'::character varying, 'other'::character varying]::text[])),
  category character varying NOT NULL,
  points integer NOT NULL,
  assessment_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT grade_items_pkey PRIMARY KEY (id),
  CONSTRAINT grade_items_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);

-- Grades (class-level)
CREATE TABLE public.grades (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid,
  student_id uuid,
  grade_item_id uuid,
  score integer NOT NULL,
  max_score integer NOT NULL,
  percentage numeric NOT NULL,
  feedback text,
  graded_by uuid,
  graded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT grades_pkey PRIMARY KEY (id),
  CONSTRAINT grades_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT grades_grade_item_id_fkey FOREIGN KEY (grade_item_id) REFERENCES public.grade_items(id),
  CONSTRAINT grades_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id)
);

-- ============================================================================
-- PROGRESS TRACKING TABLES
-- ============================================================================

-- Lesson progress
CREATE TABLE public.lesson_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid,
  lesson_id uuid,
  status character varying DEFAULT 'not_started'::character varying CHECK (status::text = ANY (ARRAY['not_started'::character varying, 'in_progress'::character varying, 'completed'::character varying]::text[])),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  time_spent integer DEFAULT 0,
  last_accessed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
);

-- Progress (general)
CREATE TABLE public.progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid,
  lesson_id uuid,
  status character varying DEFAULT 'not_started'::character varying CHECK (status::text = ANY (ARRAY['not_started'::character varying, 'in_progress'::character varying, 'completed'::character varying]::text[])),
  progress_percentage integer DEFAULT 0,
  time_spent integer DEFAULT 0,
  last_accessed timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT progress_pkey PRIMARY KEY (id),
  CONSTRAINT progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
);

-- ============================================================================
-- DISCUSSION TABLES
-- ============================================================================

-- Course discussions
CREATE TABLE public.course_discussions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid,
  title character varying NOT NULL,
  content text NOT NULL,
  author_id uuid,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_discussions_pkey PRIMARY KEY (id),
  CONSTRAINT course_discussions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_discussions_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- Discussions (general)
CREATE TABLE public.discussions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid,
  title character varying NOT NULL,
  content text,
  author_id uuid,
  published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussions_pkey PRIMARY KEY (id),
  CONSTRAINT discussions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT discussions_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- Discussion replies
CREATE TABLE public.discussion_replies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  discussion_id uuid,
  parent_reply_id uuid,
  author_id uuid,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_replies_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_replies_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.course_discussions(id),
  CONSTRAINT discussion_replies_parent_reply_id_fkey FOREIGN KEY (parent_reply_id) REFERENCES public.discussion_replies(id),
  CONSTRAINT discussion_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- Discussion votes
CREATE TABLE public.discussion_votes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  discussion_id uuid,
  reply_id uuid,
  user_id uuid,
  vote_type character varying NOT NULL CHECK (vote_type::text = ANY (ARRAY['up'::character varying, 'down'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_votes_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_votes_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.course_discussions(id),
  CONSTRAINT discussion_votes_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.discussion_replies(id),
  CONSTRAINT discussion_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Lesson discussions
CREATE TABLE public.lesson_discussions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lesson_id uuid,
  course_id uuid,
  title character varying NOT NULL,
  content text NOT NULL,
  author_id uuid,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  published boolean DEFAULT true,
  CONSTRAINT lesson_discussions_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_discussions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT lesson_discussions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT lesson_discussions_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- Lesson discussion replies
CREATE TABLE public.lesson_discussion_replies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  discussion_id uuid,
  parent_reply_id uuid,
  author_id uuid,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_discussion_replies_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_discussion_replies_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.lesson_discussions(id),
  CONSTRAINT lesson_discussion_replies_parent_reply_id_fkey FOREIGN KEY (parent_reply_id) REFERENCES public.lesson_discussion_replies(id),
  CONSTRAINT lesson_discussion_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- Lesson discussion votes
CREATE TABLE public.lesson_discussion_votes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  discussion_id uuid,
  reply_id uuid,
  user_id uuid,
  vote_type character varying NOT NULL CHECK (vote_type::text = ANY (ARRAY['up'::character varying, 'down'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_discussion_votes_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_discussion_votes_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.lesson_discussions(id),
  CONSTRAINT lesson_discussion_votes_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.lesson_discussion_replies(id),
  CONSTRAINT lesson_discussion_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- ANNOUNCEMENT TABLES
-- ============================================================================

-- Course announcements
CREATE TABLE public.course_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  author_id uuid NOT NULL,
  title character varying NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  attachment_url character varying,
  attachment_name character varying,
  scheduled_for timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT course_announcements_pkey PRIMARY KEY (id),
  CONSTRAINT course_announcements_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- Announcement views
CREATE TABLE public.announcement_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT announcement_views_pkey PRIMARY KEY (id),
  CONSTRAINT announcement_views_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.course_announcements(id),
  CONSTRAINT announcement_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- RESOURCE TABLES
-- ============================================================================

-- Files
CREATE TABLE public.files (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  type character varying NOT NULL,
  size bigint NOT NULL,
  url character varying NOT NULL,
  uploaded_by uuid,
  course_id uuid,
  lesson_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT files_pkey PRIMARY KEY (id),
  CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id),
  CONSTRAINT files_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT files_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
);

-- Resource links
CREATE TABLE public.resource_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid,
  lesson_id uuid,
  title character varying NOT NULL,
  url text NOT NULL,
  description text,
  link_type character varying DEFAULT 'external'::character varying CHECK (link_type::text = ANY (ARRAY['external'::character varying, 'document'::character varying, 'video'::character varying, 'article'::character varying, 'tool'::character varying, 'other'::character varying]::text[])),
  icon character varying,
  "order" integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resource_links_pkey PRIMARY KEY (id),
  CONSTRAINT resource_links_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT resource_links_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT resource_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- ============================================================================
-- SCORM TABLES
-- ============================================================================

-- SCORM packages
CREATE TABLE public.scorm_packages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lesson_id uuid NOT NULL UNIQUE,
  course_id uuid,
  title character varying NOT NULL,
  description text,
  scorm_version character varying NOT NULL CHECK (scorm_version::text = ANY (ARRAY['1.2'::character varying, '2004'::character varying]::text[])),
  package_url text NOT NULL,
  manifest_xml text,
  package_size bigint,
  identifier character varying,
  schema_version character varying,
  schema_location character varying,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scorm_packages_pkey PRIMARY KEY (id),
  CONSTRAINT scorm_packages_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT scorm_packages_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT scorm_packages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- SCORM tracking
CREATE TABLE public.scorm_tracking (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  scorm_package_id uuid NOT NULL,
  course_id uuid,
  lesson_id uuid,
  completion_status character varying DEFAULT 'unknown'::character varying,
  success_status character varying,
  score_raw numeric,
  score_max numeric,
  score_min numeric,
  score_scaled numeric CHECK (score_scaled >= '-1'::integer::numeric AND score_scaled <= 1::numeric),
  progress_measure numeric CHECK (progress_measure >= 0::numeric AND progress_measure <= 1::numeric),
  time_spent integer DEFAULT 0,
  session_time integer DEFAULT 0,
  total_time character varying,
  entry character varying DEFAULT 'ab-initio'::character varying,
  exit character varying,
  location text,
  launch_data text,
  suspend_data text,
  interactions jsonb DEFAULT '[]'::jsonb,
  objectives jsonb DEFAULT '[]'::jsonb,
  scaled_passing_score numeric,
  mastery_score numeric,
  max_time_allowed character varying,
  time_limit_action character varying,
  last_accessed timestamp with time zone DEFAULT now(),
  last_saved timestamp with time zone DEFAULT now(),
  attempts integer DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scorm_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT scorm_tracking_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT scorm_tracking_scorm_package_id_fkey FOREIGN KEY (scorm_package_id) REFERENCES public.scorm_packages(id),
  CONSTRAINT scorm_tracking_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT scorm_tracking_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
);

-- ============================================================================
-- VIDEO CONFERENCE TABLES
-- ============================================================================

-- Video conferences
CREATE TABLE public.video_conferences (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  course_id uuid,
  lesson_id uuid,
  instructor_id uuid,
  meeting_id character varying NOT NULL UNIQUE,
  meeting_url text NOT NULL,
  meeting_password character varying,
  scheduled_at timestamp with time zone,
  duration_minutes integer DEFAULT 60,
  max_participants integer DEFAULT 100,
  recording_enabled boolean DEFAULT false,
  waiting_room_enabled boolean DEFAULT true,
  status character varying DEFAULT 'scheduled'::character varying CHECK (status::text = ANY (ARRAY['scheduled'::character varying, 'live'::character varying, 'ended'::character varying, 'cancelled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  video_provider character varying DEFAULT '8x8vc'::character varying CHECK (video_provider::text = ANY (ARRAY['8x8vc'::character varying, 'google_meet'::character varying, 'bigbluebutton'::character varying]::text[])),
  google_meet_link text,
  timezone character varying DEFAULT 'America/New_York'::character varying,
  bbb_meeting_id character varying,
  bbb_attendee_pw character varying,
  bbb_moderator_pw character varying,
  CONSTRAINT video_conferences_pkey PRIMARY KEY (id),
  CONSTRAINT video_conferences_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT video_conferences_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT video_conferences_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
);

-- Conference participants
CREATE TABLE public.conference_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conference_id uuid,
  user_id uuid,
  joined_at timestamp with time zone,
  left_at timestamp with time zone,
  role character varying DEFAULT 'participant'::character varying CHECK (role::text = ANY (ARRAY['host'::character varying, 'co-host'::character varying, 'participant'::character varying]::text[])),
  CONSTRAINT conference_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conference_participants_conference_id_fkey FOREIGN KEY (conference_id) REFERENCES public.video_conferences(id),
  CONSTRAINT conference_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Conference recordings
CREATE TABLE public.conference_recordings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conference_id uuid,
  recording_url text NOT NULL,
  recording_duration integer,
  file_size bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conference_recordings_pkey PRIMARY KEY (id),
  CONSTRAINT conference_recordings_conference_id_fkey FOREIGN KEY (conference_id) REFERENCES public.video_conferences(id)
);

-- ============================================================================
-- ATTENDANCE TABLE
-- ============================================================================

-- Attendance
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid,
  date date NOT NULL,
  records jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);

-- ============================================================================
-- CERTIFICATION AND BADGES TABLES
-- ============================================================================

-- Badges
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  criteria_url text,
  issuer_name character varying NOT NULL DEFAULT 'OECS Learning Hub'::character varying,
  issuer_url text,
  issuer_email text,
  badge_class_id character varying,
  tags text[],
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT badges_pkey PRIMARY KEY (id),
  CONSTRAINT badges_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- User badges
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  course_id uuid,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  evidence_url text,
  badge_assertion jsonb,
  verification_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id),
  CONSTRAINT user_badges_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Certificate templates
CREATE TABLE public.certificate_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  template_html text NOT NULL,
  background_image_url text,
  logo_url text,
  is_default boolean NOT NULL DEFAULT false,
  variables jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT certificate_templates_pkey PRIMARY KEY (id),
  CONSTRAINT certificate_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Certificates
CREATE TABLE public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  template_id uuid,
  verification_code character varying NOT NULL UNIQUE,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  pdf_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  grade_percentage numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT certificates_pkey PRIMARY KEY (id),
  CONSTRAINT certificates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.certificate_templates(id),
  CONSTRAINT certificates_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- CEU credits
CREATE TABLE public.ceu_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  credits numeric NOT NULL,
  credit_type character varying NOT NULL DEFAULT 'CEU'::character varying,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  certificate_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ceu_credits_pkey PRIMARY KEY (id),
  CONSTRAINT ceu_credits_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT ceu_credits_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(id),
  CONSTRAINT ceu_credits_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id)
);

-- ============================================================================
-- AI TUTOR TABLES
-- ============================================================================

-- AI tutor preferences
CREATE TABLE public.ai_tutor_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  preferred_style character varying DEFAULT 'balanced'::character varying CHECK (preferred_style::text = ANY (ARRAY['simple'::character varying, 'detailed'::character varying, 'balanced'::character varying]::text[])),
  learning_focus character varying DEFAULT 'general'::character varying,
  auto_activate boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_tutor_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT ai_tutor_preferences_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id)
);

-- AI tutor conversations
CREATE TABLE public.ai_tutor_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  course_id uuid,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  context_data jsonb,
  response_type character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_tutor_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT ai_tutor_conversations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT ai_tutor_conversations_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT ai_tutor_conversations_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- AI tutor analytics
CREATE TABLE public.ai_tutor_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  course_id uuid,
  interaction_count integer DEFAULT 0,
  questions_asked integer DEFAULT 0,
  concepts_explained integer DEFAULT 0,
  examples_requested integer DEFAULT 0,
  help_requests integer DEFAULT 0,
  practice_requests integer DEFAULT 0,
  session_duration integer DEFAULT 0,
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_tutor_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT ai_tutor_analytics_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT ai_tutor_analytics_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT ai_tutor_analytics_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- ============================================================================
-- SYSTEM SETTINGS TABLES
-- ============================================================================

-- Site settings
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key character varying NOT NULL UNIQUE,
  setting_value text,
  setting_type character varying DEFAULT 'text'::character varying,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_settings_pkey PRIMARY KEY (id),
  CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- System settings
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key character varying NOT NULL UNIQUE,
  setting_value text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT system_settings_pkey PRIMARY KEY (id),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
