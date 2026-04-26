-- ============================================================================
-- Part 38: Expand courses.modality vocabulary to match the create-course form
-- ============================================================================
-- Depends on: 001 (courses table + courses_modality_check)
-- ============================================================================
-- The create-course / edit-course forms (app/admin/courses/manage/_components/
-- CourseForm.tsx) offer three modality options that better describe how a
-- course is *paced* than the original physical-attendance vocabulary:
--
--   self_paced | blended | instructor_led
--
-- The original CHECK constraint accepted only online | blended | in_person,
-- so any insert from the new form failed with PostgreSQL 23514:
--   new row for relation "courses" violates check constraint
--   "courses_modality_check"
--
-- This migration broadens the constraint to accept the union of both
-- vocabularies so existing rows (online, in_person) keep validating and new
-- inserts from the form (self_paced, instructor_led) succeed. It also
-- updates the column default to 'self_paced' to match the form's default
-- and the API's `body.modality || "self_paced"` fallback.
--
-- This migration is idempotent: re-running it is a no-op.
-- ============================================================================

-- 1. Drop the old constraint if it exists
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_modality_check;

-- 2. Re-add with the broadened vocabulary
ALTER TABLE public.courses
  ADD CONSTRAINT courses_modality_check
  CHECK (modality IN (
    'self_paced',
    'blended',
    'instructor_led',
    -- Legacy values still accepted so existing rows validate. New code
    -- should prefer the three pacing-oriented values above.
    'online',
    'in_person'
  ));

-- 3. Update the column default to match the form
ALTER TABLE public.courses
  ALTER COLUMN modality SET DEFAULT 'self_paced';

COMMENT ON COLUMN public.courses.modality IS
  'Pacing modality. Preferred values: self_paced, blended, instructor_led. Legacy: online, in_person (kept for backwards compatibility).';

NOTIFY pgrst, 'reload schema';
