-- ============================================================================
-- Part 39: Add inline-text resources to resource_links
-- ============================================================================
-- Depends on: 004 (resource_links table)
-- ============================================================================
-- The lesson "Resources" sidebar (app/components/lesson/ResourceLinksSidebar
-- .tsx) currently only stores link-shaped rows: a non-null URL pointing at
-- an external page, an uploaded file, or a Google Drive item. Instructors
-- have asked for a fourth shape — a short rich-text note authored with the
-- platform's native editor — that lives alongside the links and renders
-- inline.
--
-- Schema changes:
--   * url is now nullable so text rows don't need a placeholder URL.
--   * link_type accepts a new 'text' value (the existing six values are
--     preserved unchanged).
--   * A new body_html TEXT column holds the sanitised HTML body for text
--     rows. The API sanitises with the same sanitizeHtml helper used by
--     all other rich-text content blocks before insert/update.
--   * A row-level CHECK enforces the shape contract:
--       - link_type='text'  → body_html IS NOT NULL  AND url IS NULL
--       - any other type    → url       IS NOT NULL
--     This stops the two shapes from being silently mixed up.
--
-- This migration is idempotent: re-running is a no-op.
-- ============================================================================

-- 1. Allow url to be null
ALTER TABLE public.resource_links
  ALTER COLUMN url DROP NOT NULL;

-- 2. Add the body_html column (no-op if already added)
ALTER TABLE public.resource_links
  ADD COLUMN IF NOT EXISTS body_html TEXT;

-- 3. Broaden link_type to accept 'text'
ALTER TABLE public.resource_links
  DROP CONSTRAINT IF EXISTS resource_links_link_type_check;

ALTER TABLE public.resource_links
  ADD CONSTRAINT resource_links_link_type_check
  CHECK (link_type IN (
    'external',
    'document',
    'video',
    'article',
    'tool',
    'other',
    'text'
  ));

-- 4. Row-level shape constraint: text rows require body_html and no url;
--    every other type still requires a url.
ALTER TABLE public.resource_links
  DROP CONSTRAINT IF EXISTS resource_links_shape_check;

ALTER TABLE public.resource_links
  ADD CONSTRAINT resource_links_shape_check
  CHECK (
    (link_type = 'text' AND body_html IS NOT NULL AND url IS NULL)
    OR
    (link_type <> 'text' AND url IS NOT NULL)
  );

COMMENT ON COLUMN public.resource_links.body_html IS
  'Sanitised HTML body for inline-text resources (link_type=''text''). NULL for link rows.';

COMMENT ON COLUMN public.resource_links.url IS
  'External URL for link rows. NULL for inline-text rows (link_type=''text'').';

NOTIFY pgrst, 'reload schema';
