-- ============================================================================
-- Part 43: course-materials storage bucket — raise file size limit
-- ============================================================================
-- Depends on: Supabase Storage bucket `course-materials` (provisioned via the
--   Supabase dashboard; see docs/archive/SUPABASE_STORAGE_SETUP.md).
-- ============================================================================
-- The `course-materials` bucket was created via the Supabase dashboard with
-- the default 50MB per-object cap. The lesson editor's video upload path
-- (FileUpload + /api/media/signed-url + direct PUT to Supabase) was getting
-- a 400 from Storage on .mp4 uploads larger than that, even after the API
-- and client-side caps were bumped — because Storage enforces the bucket's
-- own file_size_limit before honoring the signed URL.
--
-- Raises the bucket cap to 200MB. That matches the ceiling already enforced
-- by /api/media/signed-url and leaves headroom over the 100MB video cap and
-- 50MB non-video cap applied at the application layer (FileUpload).
-- ============================================================================

UPDATE storage.buckets
SET file_size_limit = 200 * 1024 * 1024  -- 200 MB
WHERE id = 'course-materials';
