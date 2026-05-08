-- ============================================================================
-- Part 50: Activity-types registry — `activity_module_types` table
-- ============================================================================
-- Depends on: 002 (lessons.content_type)
-- ============================================================================
-- Lessons today carry a free-text `content_type` column whose CHECK
-- constraint enumerates the 5 supported types: rich_text, video, scorm,
-- quiz, assignment. Adding a new type means dropping/recreating that
-- constraint plus extending every renderer's switch statement.
--
-- This migration replaces the CHECK constraint with a foreign key to a
-- new `activity_module_types` table, seeded with one row per existing
-- type. Adding a new type now means: insert a row + register a module
-- in code. Existing data is untouched — every current `lessons.content_type`
-- value already resolves to one of the seeded ids.
--
-- The `capabilities` JSONB column declares what each type does (gradable,
-- attempts, completion) so callers can consult metadata instead of
-- hardcoding switch cases.
--
-- Reversible: drop FK, drop table, restore the CHECK constraint.
-- Idempotent: ON CONFLICT skips re-seeding.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_module_types (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  -- Capability flags. Shape (additive over time):
  --   { gradable: bool, completion: bool, attempts: bool, requires_content: bool, has_native_renderer: bool }
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.activity_module_types IS
  'Registry of installed lesson activity types. New types are added here and registered in code; lessons.content_type references this table.';
COMMENT ON COLUMN public.activity_module_types.capabilities IS
  'Capability flags consumed by app code: gradable, completion, attempts, requires_content, has_native_renderer.';
COMMENT ON COLUMN public.activity_module_types.enabled IS
  'When false, the type is hidden from the lesson-create UI but existing lessons keep working.';

-- ─── Seed the 5 existing types ──────────────────────────────────────────────

INSERT INTO public.activity_module_types (id, name, capabilities, description)
VALUES
  ('rich_text',
    'Rich text',
    '{"gradable": false, "completion": true, "attempts": false, "requires_content": true, "has_native_renderer": true}'::jsonb,
    'Authored content with text, images, embeds, and inline media.'),
  ('video',
    'Video',
    '{"gradable": false, "completion": true, "attempts": false, "requires_content": true, "has_native_renderer": true}'::jsonb,
    'Video-first lesson with optional supporting text.'),
  ('scorm',
    'SCORM package',
    '{"gradable": true, "completion": true, "attempts": true, "requires_content": false, "has_native_renderer": true}'::jsonb,
    'SCORM 1.2 / 2004 package launched in an iframe; reports completion and score back to the LMS.'),
  ('quiz',
    'Quiz',
    '{"gradable": true, "completion": true, "attempts": true, "requires_content": false, "has_native_renderer": true}'::jsonb,
    'Auto-graded quiz built from question banks; feeds the gradebook.'),
  ('assignment',
    'Assignment',
    '{"gradable": true, "completion": true, "attempts": false, "requires_content": false, "has_native_renderer": true}'::jsonb,
    'File / text submission graded by an instructor; feeds the gradebook.'),
  ('text',
    'Text (legacy)',
    '{"gradable": false, "completion": true, "attempts": false, "requires_content": true, "has_native_renderer": true}'::jsonb,
    'Legacy text type. Treated as rich_text by the renderer.')
ON CONFLICT (id) DO NOTHING;

-- ─── Swap the CHECK constraint for an FK ────────────────────────────────────
-- We do this only after the registry rows exist, so any orphan
-- `lessons.content_type` value that doesn't resolve will raise
-- a clear error at migration time rather than silently degrading.

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_content_type_check;

DO $$
DECLARE
  v_orphans INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphans
  FROM public.lessons l
  WHERE l.content_type IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.activity_module_types t
      WHERE t.id = l.content_type
    );
  IF v_orphans > 0 THEN
    RAISE EXCEPTION
      'Cannot install activity_module_types FK: % lesson rows reference a content_type that is not in activity_module_types. Inspect: SELECT DISTINCT content_type FROM lessons WHERE content_type NOT IN (SELECT id FROM activity_module_types);',
      v_orphans;
  END IF;
END $$;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_content_type_fkey;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_content_type_fkey
    FOREIGN KEY (content_type) REFERENCES public.activity_module_types(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_lessons_content_type
  ON public.lessons(content_type);
