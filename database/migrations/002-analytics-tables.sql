-- ============================================================================
-- Analytics Tables Migration
-- Phase 3: Advanced Analytics - Database Schema
-- ============================================================================
-- This migration creates tables for:
-- - Student risk scores
-- - Custom reports
-- - Report schedules
-- - AI insights
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Student Risk Scores Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one risk score per student per course at a time
  UNIQUE(student_id, course_id, calculated_at)
);

-- Indexes for student_risk_scores
CREATE INDEX IF NOT EXISTS idx_student_risk_scores_student_id ON student_risk_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_scores_course_id ON student_risk_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_scores_risk_level ON student_risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_student_risk_scores_calculated_at ON student_risk_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_risk_scores_risk_score ON student_risk_scores(risk_score DESC);

-- ============================================================================
-- Custom Reports Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE custom_reports 
        ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add is_template column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'is_template'
    ) THEN
        ALTER TABLE custom_reports 
        ADD COLUMN is_template BOOLEAN DEFAULT false;
    END IF;
    
    -- Add config column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'config'
    ) THEN
        ALTER TABLE custom_reports 
        ADD COLUMN config JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE custom_reports 
        ADD COLUMN description TEXT;
    END IF;
    
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE custom_reports 
        ADD COLUMN name TEXT;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE custom_reports 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE custom_reports 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Indexes for custom_reports (only create if columns exist)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON custom_reports(user_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'is_template'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_custom_reports_is_template ON custom_reports(is_template);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'custom_reports' 
        AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_custom_reports_created_at ON custom_reports(created_at DESC);
    END IF;
END $$;

-- ============================================================================
-- Report Schedules Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  next_run TIMESTAMP WITH TIME ZONE,
  last_run TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for report_schedules
CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_schedules_is_active ON report_schedules(is_active);

-- ============================================================================
-- AI Insights Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_type TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'student', 'course', 'instructor', 'system'
  entity_id UUID NOT NULL,
  insight TEXT NOT NULL,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_actionable BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Composite index for efficient queries
  UNIQUE(insight_type, entity_type, entity_id, created_at)
);

-- Indexes for ai_insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_entity_type_id ON ai_insights(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_insight_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_is_read ON ai_insights(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_ai_insights_is_actionable ON ai_insights(is_actionable) WHERE is_actionable = true;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Students can view own risk scores" ON student_risk_scores;
DROP POLICY IF EXISTS "Instructors can view all risk scores" ON student_risk_scores;
DROP POLICY IF EXISTS "System can manage risk scores" ON student_risk_scores;
DROP POLICY IF EXISTS "Users can view own reports" ON custom_reports;
DROP POLICY IF EXISTS "Users can create own reports" ON custom_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON custom_reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON custom_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON custom_reports;
DROP POLICY IF EXISTS "Users can manage own report schedules" ON report_schedules;
DROP POLICY IF EXISTS "Users can view related insights" ON ai_insights;
DROP POLICY IF EXISTS "System can insert insights" ON ai_insights;

-- Enable RLS on all tables
ALTER TABLE student_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Student Risk Scores Policies
-- Students can view their own risk scores
CREATE POLICY "Students can view own risk scores"
  ON student_risk_scores
  FOR SELECT
  USING (
    auth.uid() = student_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
    )
  );

-- Instructors and admins can view all risk scores
CREATE POLICY "Instructors can view all risk scores"
  ON student_risk_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
    )
  );

-- System can insert/update risk scores
CREATE POLICY "System can manage risk scores"
  ON student_risk_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Custom Reports Policies
-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON custom_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own reports
CREATE POLICY "Users can create own reports"
  ON custom_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
  ON custom_reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
  ON custom_reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON custom_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Report Schedules Policies
-- Users can manage schedules for their own reports
CREATE POLICY "Users can manage own report schedules"
  ON report_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_schedules.report_id
      AND custom_reports.user_id = auth.uid()
    )
  );

-- AI Insights Policies
-- Users can view insights related to them
CREATE POLICY "Users can view related insights"
  ON ai_insights
  FOR SELECT
  USING (
    (entity_type = 'student' AND entity_id = auth.uid()) OR
    (entity_type = 'instructor' AND entity_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
    )
  );

-- System can insert insights
CREATE POLICY "System can insert insights"
  ON ai_insights
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- Functions for Analytics
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_custom_reports_updated_at ON custom_reports;
DROP TRIGGER IF EXISTS update_report_schedules_updated_at ON report_schedules;

-- Triggers for updated_at
CREATE TRIGGER update_custom_reports_updated_at
  BEFORE UPDATE ON custom_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE student_risk_scores IS 'Stores calculated risk scores for students in courses';
COMMENT ON TABLE custom_reports IS 'Stores user-created custom report configurations';
COMMENT ON TABLE report_schedules IS 'Stores scheduled report generation configurations';
COMMENT ON TABLE ai_insights IS 'Stores AI-generated insights for various entities';

COMMENT ON COLUMN student_risk_scores.factors IS 'JSON object containing risk factors and their weights';
COMMENT ON COLUMN custom_reports.config IS 'JSON object containing report configuration (data sources, filters, visualizations)';
COMMENT ON COLUMN ai_insights.metadata IS 'Additional metadata about the insight (source data, model version, etc.)';

