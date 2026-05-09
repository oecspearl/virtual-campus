-- ============================================================================
-- Part 54: Backfill empty users.name
-- ============================================================================
-- Depends on: 001 (users)
-- ============================================================================
-- Some users.name rows are stored as the empty string. Microsoft Entra
-- (Azure AD) work/school accounts that signed in before the OAuth fix
-- could end up here: their ID token omits the `email` claim, the
-- previous code skipped the ID-token path, and Graph's userinfo
-- sometimes returned without `name`. Password signups that didn't
-- capture full_name landed in the same state.
--
-- These users render as "Unknown User" in /admin/users/manage and in
-- enrolment tables. Fall back, in order:
--
--   1. auth.users.raw_user_meta_data->>'full_name'
--   2. auth.users.raw_user_meta_data->>'name'
--   3. the email prefix (always present — users.email is NOT NULL UNIQUE)
--
-- The OAuth flow now self-heals on next sign-in, but this migration
-- fixes already-affected rows without waiting for re-login.
--
-- Idempotent: only touches rows where name is currently empty/null.
-- Safe to re-run.
-- ============================================================================

UPDATE public.users u
SET
  name = COALESCE(
    NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1)
  ),
  updated_at = NOW()
FROM auth.users au
WHERE au.id = u.id
  AND (u.name IS NULL OR TRIM(u.name) = '');

-- Catch any users with no matching auth.users row (shouldn't normally
-- happen, but the foreign-key only goes one way). Fall back to email
-- prefix so the registry stops showing "Unknown User".
UPDATE public.users
SET
  name = split_part(email, '@', 1),
  updated_at = NOW()
WHERE (name IS NULL OR TRIM(name) = '')
  AND email IS NOT NULL
  AND email <> '';
