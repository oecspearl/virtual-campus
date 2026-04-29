-- ============================================================================
-- Part 41: Public courses
-- ============================================================================
-- Depends on: 001 (courses)
-- ============================================================================
-- Adds an `is_public` flag to courses so a tenant can mark specific courses as
-- open to unauthenticated visitors (e.g. an open-online course, prospectus
-- content, or a free intro module). When false (the default), only enrolled
-- students and staff can read the course's content; the new
-- requireCourseAccess() helper in lib/enrollment-check.ts honors this flag.
--
-- Important: `is_public` only opens *read* access to lessons, materials, and
-- discussion threads. Writes (assignment submissions, quiz attempts,
-- discussion posts, progress saves) still require an active enrollment, so a
-- public course doesn't become an anonymous-write surface or break the
-- gradebook.
-- ============================================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Partial index — only public courses get indexed since they are the
-- minority case and the unauthenticated catalog query filters on
-- (is_public = true).
CREATE INDEX IF NOT EXISTS idx_courses_is_public
  ON courses(is_public)
  WHERE is_public = true;

COMMENT ON COLUMN public.courses.is_public IS
  'When true, course content is readable by unauthenticated visitors. '
  'Writes still require an active enrollment.';
