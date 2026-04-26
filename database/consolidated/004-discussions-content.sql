-- ============================================================================
-- Part 4: Discussions, Announcements, Files, SCORM, Video Conferences
-- ============================================================================
-- Depends on: 001, 002, 003
-- ============================================================================

-- ============================================================================
-- COURSE DISCUSSIONS
-- ============================================================================

CREATE TABLE public.course_discussions (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID REFERENCES courses(id),
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_graded BOOLEAN DEFAULT false,
  points INTEGER,
  rubric JSONB,
  due_date TIMESTAMPTZ,
  grading_criteria TEXT,
  min_replies INTEGER DEFAULT 0,
  min_words INTEGER DEFAULT 0,
  show_in_curriculum BOOLEAN DEFAULT false,
  curriculum_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT course_discussions_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_course_discussions_tenant ON course_discussions(tenant_id);
CREATE INDEX idx_course_discussions_course ON course_discussions(course_id);
CREATE INDEX idx_course_discussions_author ON course_discussions(author_id);
CREATE INDEX idx_course_discussions_is_graded ON course_discussions(is_graded) WHERE is_graded = true;
CREATE INDEX idx_course_discussions_due_date ON course_discussions(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_course_discussions_curriculum ON course_discussions(course_id, show_in_curriculum) WHERE show_in_curriculum = true;

-- ============================================================================
-- DISCUSSIONS (General)
-- ============================================================================

CREATE TABLE public.discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID REFERENCES courses(id),
  title VARCHAR NOT NULL,
  content TEXT,
  author_id UUID REFERENCES users(id),
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT discussions_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_discussions_tenant ON discussions(tenant_id);
CREATE INDEX idx_discussions_course ON discussions(course_id);

-- ============================================================================
-- DISCUSSION REPLIES
-- ============================================================================

CREATE TABLE public.discussion_replies (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  discussion_id UUID REFERENCES course_discussions(id),
  parent_reply_id UUID REFERENCES discussion_replies(id),
  author_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT discussion_replies_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_discussion_replies_tenant ON discussion_replies(tenant_id);
CREATE INDEX idx_discussion_replies_discussion ON discussion_replies(discussion_id);

-- ============================================================================
-- DISCUSSION VOTES
-- ============================================================================

CREATE TABLE public.discussion_votes (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  discussion_id UUID REFERENCES course_discussions(id),
  reply_id UUID REFERENCES discussion_replies(id),
  user_id UUID REFERENCES users(id),
  vote_type VARCHAR NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT discussion_votes_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_discussion_votes_tenant ON discussion_votes(tenant_id);

-- ============================================================================
-- LESSON DISCUSSIONS
-- ============================================================================

CREATE TABLE public.lesson_discussions (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id UUID REFERENCES lessons(id),
  course_id UUID REFERENCES courses(id),
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lesson_discussions_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_lesson_discussions_tenant ON lesson_discussions(tenant_id);
CREATE INDEX idx_lesson_discussions_lesson ON lesson_discussions(lesson_id);
CREATE INDEX idx_lesson_discussions_course ON lesson_discussions(course_id);

-- ============================================================================
-- LESSON DISCUSSION REPLIES
-- ============================================================================

CREATE TABLE public.lesson_discussion_replies (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  discussion_id UUID REFERENCES lesson_discussions(id),
  parent_reply_id UUID REFERENCES lesson_discussion_replies(id),
  author_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lesson_discussion_replies_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_lesson_discussion_replies_tenant ON lesson_discussion_replies(tenant_id);
CREATE INDEX idx_lesson_discussion_replies_discussion ON lesson_discussion_replies(discussion_id);

-- ============================================================================
-- LESSON DISCUSSION VOTES
-- ============================================================================

CREATE TABLE public.lesson_discussion_votes (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  discussion_id UUID REFERENCES lesson_discussions(id),
  reply_id UUID REFERENCES lesson_discussion_replies(id),
  user_id UUID REFERENCES users(id),
  vote_type VARCHAR NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lesson_discussion_votes_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_lesson_discussion_votes_tenant ON lesson_discussion_votes(tenant_id);

-- ============================================================================
-- DISCUSSION GRADES
-- ============================================================================

CREATE TABLE public.discussion_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  discussion_id UUID NOT NULL REFERENCES course_discussions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  total_posts INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  rubric_scores JSONB,
  score INTEGER,
  max_score INTEGER,
  percentage DECIMAL(5,2),
  feedback TEXT,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(discussion_id, student_id)
);

CREATE INDEX idx_discussion_grades_tenant ON discussion_grades(tenant_id);
CREATE INDEX idx_discussion_grades_discussion ON discussion_grades(discussion_id);
CREATE INDEX idx_discussion_grades_student ON discussion_grades(student_id);
CREATE INDEX idx_discussion_grades_course ON discussion_grades(course_id);

-- ============================================================================
-- DISCUSSION RUBRIC TEMPLATES
-- ============================================================================

CREATE TABLE public.discussion_rubric_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rubric JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discussion_rubric_templates_tenant ON discussion_rubric_templates(tenant_id);

-- ============================================================================
-- COURSE ANNOUNCEMENTS
-- ============================================================================

CREATE TABLE public.course_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id),
  author_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  attachment_url VARCHAR,
  attachment_name VARCHAR,
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT course_announcements_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_course_announcements_tenant ON course_announcements(tenant_id);
CREATE INDEX idx_course_announcements_course ON course_announcements(course_id);

-- ============================================================================
-- ANNOUNCEMENT VIEWS
-- ============================================================================

CREATE TABLE public.announcement_views (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  announcement_id UUID NOT NULL REFERENCES course_announcements(id),
  user_id UUID NOT NULL REFERENCES users(id),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT announcement_views_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_announcement_views_tenant ON announcement_views(tenant_id);
CREATE INDEX idx_announcement_views_announcement ON announcement_views(announcement_id);

-- ============================================================================
-- FILES
-- ============================================================================

CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  size BIGINT NOT NULL,
  url VARCHAR NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  lesson_id UUID REFERENCES lessons(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT files_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_files_tenant ON files(tenant_id);
CREATE INDEX idx_files_course ON files(course_id);

-- ============================================================================
-- RESOURCE LINKS
-- ============================================================================

CREATE TABLE public.resource_links (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID REFERENCES courses(id),
  lesson_id UUID REFERENCES lessons(id),
  title VARCHAR NOT NULL,
  -- url is required for link-shaped rows (any link_type except 'text')
  -- and NULL for inline-text rows. body_html holds sanitised HTML for
  -- text rows. The shape contract is enforced by resource_links_shape_check
  -- below. See migration 039-resource-links-text.sql.
  url TEXT,
  body_html TEXT,
  description TEXT,
  link_type VARCHAR DEFAULT 'external' CHECK (link_type IN ('external', 'document', 'video', 'article', 'tool', 'other', 'text')),
  icon VARCHAR,
  "order" INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT resource_links_pkey PRIMARY KEY (id),
  CONSTRAINT resource_links_shape_check CHECK (
    (link_type = 'text' AND body_html IS NOT NULL AND url IS NULL)
    OR (link_type <> 'text' AND url IS NOT NULL)
  )
);

CREATE INDEX idx_resource_links_tenant ON resource_links(tenant_id);
CREATE INDEX idx_resource_links_course ON resource_links(course_id);

-- ============================================================================
-- SCORM PACKAGES
-- ============================================================================

CREATE TABLE public.scorm_packages (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id UUID NOT NULL UNIQUE REFERENCES lessons(id),
  course_id UUID REFERENCES courses(id),
  title VARCHAR NOT NULL,
  description TEXT,
  scorm_version VARCHAR NOT NULL CHECK (scorm_version IN ('1.2', '2004')),
  package_url TEXT NOT NULL,
  manifest_xml TEXT,
  package_size BIGINT,
  identifier VARCHAR,
  schema_version VARCHAR,
  schema_location VARCHAR,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scorm_packages_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_scorm_packages_tenant ON scorm_packages(tenant_id);
CREATE INDEX idx_scorm_packages_lesson ON scorm_packages(lesson_id);

-- ============================================================================
-- SCORM TRACKING
-- ============================================================================

CREATE TABLE public.scorm_tracking (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id),
  scorm_package_id UUID NOT NULL REFERENCES scorm_packages(id),
  course_id UUID REFERENCES courses(id),
  lesson_id UUID REFERENCES lessons(id),
  completion_status VARCHAR DEFAULT 'unknown',
  success_status VARCHAR,
  score_raw NUMERIC,
  score_max NUMERIC,
  score_min NUMERIC,
  score_scaled NUMERIC CHECK (score_scaled >= -1 AND score_scaled <= 1),
  progress_measure NUMERIC CHECK (progress_measure >= 0 AND progress_measure <= 1),
  time_spent INTEGER DEFAULT 0,
  session_time INTEGER DEFAULT 0,
  total_time VARCHAR,
  entry VARCHAR DEFAULT 'ab-initio',
  exit VARCHAR,
  location TEXT,
  launch_data TEXT,
  suspend_data TEXT,
  interactions JSONB DEFAULT '[]'::jsonb,
  objectives JSONB DEFAULT '[]'::jsonb,
  scaled_passing_score NUMERIC,
  mastery_score NUMERIC,
  max_time_allowed VARCHAR,
  time_limit_action VARCHAR,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  last_saved TIMESTAMPTZ DEFAULT NOW(),
  attempts INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scorm_tracking_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_scorm_tracking_tenant ON scorm_tracking(tenant_id);
CREATE INDEX idx_scorm_tracking_student ON scorm_tracking(student_id);
CREATE INDEX idx_scorm_tracking_package ON scorm_tracking(scorm_package_id);

-- ============================================================================
-- VIDEO CONFERENCES
-- ============================================================================

CREATE TABLE public.video_conferences (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR NOT NULL,
  description TEXT,
  course_id UUID REFERENCES courses(id),
  lesson_id UUID REFERENCES lessons(id),
  instructor_id UUID REFERENCES users(id),
  meeting_id VARCHAR NOT NULL UNIQUE,
  meeting_url TEXT NOT NULL,
  meeting_password VARCHAR,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  max_participants INTEGER DEFAULT 100,
  recording_enabled BOOLEAN DEFAULT false,
  waiting_room_enabled BOOLEAN DEFAULT true,
  status VARCHAR DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  video_provider VARCHAR DEFAULT '8x8vc' CHECK (video_provider IN ('8x8vc', 'google_meet', 'bigbluebutton')),
  google_meet_link TEXT,
  timezone VARCHAR DEFAULT 'America/New_York',
  bbb_meeting_id VARCHAR,
  bbb_attendee_pw VARCHAR,
  bbb_moderator_pw VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT video_conferences_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_video_conferences_tenant ON video_conferences(tenant_id);
CREATE INDEX idx_video_conferences_course ON video_conferences(course_id);
CREATE INDEX idx_video_conferences_instructor ON video_conferences(instructor_id);

-- ============================================================================
-- CONFERENCE PARTICIPANTS
-- ============================================================================

CREATE TABLE public.conference_participants (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  conference_id UUID REFERENCES video_conferences(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  role VARCHAR DEFAULT 'participant' CHECK (role IN ('host', 'co-host', 'participant')),
  CONSTRAINT conference_participants_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_conference_participants_tenant ON conference_participants(tenant_id);
CREATE INDEX idx_conference_participants_conference ON conference_participants(conference_id);

-- ============================================================================
-- CONFERENCE RECORDINGS
-- ============================================================================

CREATE TABLE public.conference_recordings (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  conference_id UUID REFERENCES video_conferences(id),
  recording_url TEXT NOT NULL,
  recording_duration INTEGER,
  file_size BIGINT,
  title VARCHAR,
  status VARCHAR DEFAULT 'available',
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT conference_recordings_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_conference_recordings_tenant ON conference_recordings(tenant_id);
CREATE INDEX idx_conference_recordings_conference ON conference_recordings(conference_id);

-- ============================================================================
-- ATTENDANCE
-- ============================================================================

CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  class_id UUID REFERENCES classes(id),
  date DATE NOT NULL,
  records JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);

-- ============================================================================
-- PEER REVIEW ASSIGNMENTS
-- ============================================================================

CREATE TABLE public.peer_review_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reviewer_id, submission_id)
);

CREATE INDEX idx_peer_review_assignments_tenant ON peer_review_assignments(tenant_id);
CREATE INDEX idx_peer_assignments_assignment ON peer_review_assignments(assignment_id);
CREATE INDEX idx_peer_assignments_reviewer ON peer_review_assignments(reviewer_id);
CREATE INDEX idx_peer_assignments_submission ON peer_review_assignments(submission_id);

-- ============================================================================
-- PEER REVIEWS
-- ============================================================================

CREATE TABLE public.peer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  peer_assignment_id UUID NOT NULL REFERENCES peer_review_assignments(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  feedback TEXT,
  rubric_scores JSONB,
  overall_score NUMERIC(5,2),
  is_helpful BOOLEAN,
  helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_peer_reviews_tenant ON peer_reviews(tenant_id);
CREATE INDEX idx_peer_reviews_assignment ON peer_reviews(assignment_id);
CREATE INDEX idx_peer_reviews_reviewer ON peer_reviews(reviewer_id);
CREATE INDEX idx_peer_reviews_submission ON peer_reviews(submission_id);

-- ============================================================================
-- COURSE GROUPS
-- ============================================================================

CREATE TABLE public.course_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_members INTEGER DEFAULT 5,
  allow_self_enrollment BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_course_groups_tenant ON course_groups(tenant_id);
CREATE INDEX idx_course_groups_course ON course_groups(course_id);

-- ============================================================================
-- COURSE GROUP MEMBERS
-- ============================================================================

CREATE TABLE public.course_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

CREATE INDEX idx_course_group_members_tenant ON course_group_members(tenant_id);
CREATE INDEX idx_course_group_members_group ON course_group_members(group_id);
CREATE INDEX idx_course_group_members_student ON course_group_members(student_id);

-- Add FK for assignments.group_set_id now that course_groups exists
ALTER TABLE assignments ADD CONSTRAINT assignments_group_set_id_fkey
  FOREIGN KEY (group_set_id) REFERENCES course_groups(id) ON DELETE SET NULL;

-- Add FK for assignment_submissions.group_id
ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES course_groups(id) ON DELETE SET NULL;
