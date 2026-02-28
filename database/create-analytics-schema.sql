-- Analytics & BI Schema
-- This creates analytics tables WITHOUT modifying existing tables
-- Safe to run and can be dropped without affecting core functionality

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- For scheduled jobs (if available)

-- ============================================================================
-- ANALYTICS METRICS TABLE
-- Pre-aggregated metrics for fast dashboard queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL,
  metric_value JSONB NOT NULL,
  dimensions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_metric UNIQUE(metric_type, metric_date, dimensions)
);

CREATE INDEX idx_analytics_metrics_type_date ON analytics_metrics(metric_type, metric_date DESC);
CREATE INDEX idx_analytics_metrics_dimensions ON analytics_metrics USING GIN (dimensions);
CREATE INDEX idx_analytics_metrics_date ON analytics_metrics(metric_date DESC);

COMMENT ON TABLE analytics_metrics IS 'Pre-aggregated analytics metrics for fast dashboard queries';
COMMENT ON COLUMN analytics_metrics.metric_type IS 'Type of metric: daily_active_users, course_completion, etc.';
COMMENT ON COLUMN analytics_metrics.metric_value IS 'The metric value(s) as JSON';
COMMENT ON COLUMN analytics_metrics.dimensions IS 'Filter dimensions like course_id, user_role, etc.';

-- ============================================================================
-- ANALYTICS DASHBOARDS TABLE
-- User-saved dashboard configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_analytics_dashboards_user ON analytics_dashboards(user_id);
CREATE INDEX idx_analytics_dashboards_shared ON analytics_dashboards(is_shared) WHERE is_shared = true;

COMMENT ON TABLE analytics_dashboards IS 'User-created dashboard configurations';
COMMENT ON COLUMN analytics_dashboards.config IS 'Dashboard layout, widgets, filters as JSON';

-- ============================================================================
-- ANALYTICS REPORTS TABLE
-- Scheduled or saved reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  config JSONB NOT NULL,
  schedule JSONB,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_analytics_reports_creator ON analytics_reports(created_by);
CREATE INDEX idx_analytics_reports_type ON analytics_reports(report_type);

COMMENT ON TABLE analytics_reports IS 'Saved or scheduled analytics reports';
COMMENT ON COLUMN analytics_reports.config IS 'Report filters, columns, date ranges as JSON';
COMMENT ON COLUMN analytics_reports.schedule IS 'Schedule config (cron expression) for automated reports';

-- ============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- Read-only aggregated views from existing tables
-- ============================================================================

-- Daily Active Users
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_active_users AS
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT student_id) as active_users,
  COUNT(*) as total_activities,
  COUNT(DISTINCT course_id) as active_courses
FROM student_activity_log
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX idx_analytics_dau_date ON analytics_daily_active_users(date);

-- Course Engagement
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_course_engagement AS
SELECT 
  course_id,
  DATE(created_at) as date,
  COUNT(DISTINCT student_id) as active_students,
  COUNT(*) as total_interactions,
  COUNT(DISTINCT activity_type) as activity_types
FROM student_activity_log
WHERE course_id IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY course_id, DATE(created_at)
ORDER BY course_id, date DESC;

-- Create unique index for concurrent refresh (required for CONCURRENTLY)
CREATE UNIQUE INDEX idx_analytics_course_engagement_unique ON analytics_course_engagement(course_id, date);

-- Also keep the regular index for query performance
CREATE INDEX idx_analytics_course_engagement_course ON analytics_course_engagement(course_id, date DESC);

-- Activity Type Breakdown
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_activity_types AS
SELECT 
  activity_type,
  DATE(created_at) as date,
  COUNT(*) as count,
  COUNT(DISTINCT student_id) as unique_students
FROM student_activity_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY activity_type, DATE(created_at)
ORDER BY date DESC, count DESC;

-- Create unique index for concurrent refresh (required for CONCURRENTLY)
CREATE UNIQUE INDEX idx_analytics_activity_types_unique ON analytics_activity_types(activity_type, date);

-- Also keep the regular index for query performance
CREATE INDEX idx_analytics_activity_types_type ON analytics_activity_types(activity_type, date DESC);

-- ============================================================================
-- REFRESH FUNCTION
-- Refreshes all materialized views (run periodically)
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_course_engagement;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_activity_types;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_analytics_views() IS 'Refreshes all analytics materialized views. Run daily via cron.';

-- ============================================================================
-- ROW LEVEL SECURITY
-- Only admins, instructors, and curriculum designers can access analytics
-- ============================================================================

ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;

-- Analytics Metrics: Read-only for authorized roles
CREATE POLICY "Authorized roles can view analytics metrics" ON analytics_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
    )
  );

-- Dashboards: Users can manage their own
CREATE POLICY "Users can manage own dashboards" ON analytics_dashboards
  FOR ALL
  USING (user_id = auth.uid());

-- Reports: Users can manage their own
CREATE POLICY "Users can manage own reports" ON analytics_reports
  FOR ALL
  USING (created_by = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- Utility functions for common analytics queries
-- ============================================================================

-- Get daily active users for date range
CREATE OR REPLACE FUNCTION get_daily_active_users(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  active_users BIGINT,
  total_activities BIGINT,
  active_courses BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.date,
    a.active_users,
    a.total_activities,
    a.active_courses
  FROM analytics_daily_active_users a
  WHERE a.date BETWEEN start_date AND end_date
  ORDER BY a.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get course engagement for a specific course
CREATE OR REPLACE FUNCTION get_course_engagement(
  target_course_id UUID,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  active_students BIGINT,
  total_interactions BIGINT,
  activity_types BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.date,
    a.active_students,
    a.total_interactions,
    a.activity_types
  FROM analytics_course_engagement a
  WHERE a.course_id = target_course_id
    AND a.date BETWEEN start_date AND end_date
  ORDER BY a.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIAL DATA POPULATION
-- Populate materialized views with existing data
-- ============================================================================

-- Refresh views initially
SELECT refresh_analytics_views();

-- ============================================================================
-- COMMENTS
-- Documentation for the analytics schema
-- ============================================================================

COMMENT ON SCHEMA public IS 'Analytics tables use the analytics_* prefix to avoid conflicts with core tables';
