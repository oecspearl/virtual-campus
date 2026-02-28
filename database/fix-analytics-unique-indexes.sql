-- Fix: Add unique indexes to materialized views for concurrent refresh
-- Run this if you get the error: "cannot refresh materialized view concurrently"
-- This adds the required unique indexes without recreating the views

-- ============================================================================
-- FIX ANALYTICS_COURSE_ENGAGEMENT
-- ============================================================================

-- Drop existing regular index if it exists (to avoid conflicts)
DROP INDEX IF EXISTS idx_analytics_course_engagement_course;

-- Create unique index (REQUIRED for concurrent refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_course_engagement_unique 
ON analytics_course_engagement(course_id, date);

-- Recreate the regular index for query performance
CREATE INDEX IF NOT EXISTS idx_analytics_course_engagement_course 
ON analytics_course_engagement(course_id, date DESC);

-- ============================================================================
-- FIX ANALYTICS_ACTIVITY_TYPES
-- ============================================================================

-- Drop existing regular index if it exists (to avoid conflicts)
DROP INDEX IF EXISTS idx_analytics_activity_types_type;

-- Create unique index (REQUIRED for concurrent refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_activity_types_unique 
ON analytics_activity_types(activity_type, date);

-- Recreate the regular index for query performance
CREATE INDEX IF NOT EXISTS idx_analytics_activity_types_type 
ON analytics_activity_types(activity_type, date DESC);

-- ============================================================================
-- VERIFY: Test concurrent refresh now works
-- ============================================================================

-- This should now work without errors
DO $$
BEGIN
  RAISE NOTICE 'Testing concurrent refresh...';
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_course_engagement;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_activity_types;
  RAISE NOTICE 'All materialized views refreshed successfully!';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- PostgreSQL requires unique indexes (with no WHERE clause) on materialized
-- views to support CONCURRENT refresh. This prevents locking during refresh.
--
-- The unique indexes ensure:
-- 1. Each row combination is unique (course_id + date, activity_type + date)
-- 2. Concurrent refresh can use these indexes without blocking reads
--
-- After running this fix, the refresh_analytics_views() function will work.
