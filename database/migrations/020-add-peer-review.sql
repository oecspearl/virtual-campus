-- Migration: 020-add-peer-review.sql
-- Add peer review support to assignments

-- Add peer review settings to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS peer_review_enabled BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS peer_reviews_required INTEGER DEFAULT 2;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS peer_review_due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS peer_review_rubric JSONB;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS peer_review_anonymous BOOLEAN DEFAULT true;

-- Peer review assignments (which student reviews which submission)
CREATE TABLE IF NOT EXISTS peer_review_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reviewer_id, submission_id)
);

-- Peer reviews (the actual review content)
CREATE TABLE IF NOT EXISTS peer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    peer_assignment_id UUID NOT NULL REFERENCES peer_review_assignments(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    feedback TEXT,
    rubric_scores JSONB,
    overall_score NUMERIC(5,2),
    is_helpful BOOLEAN,
    helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_peer_assignments_assignment ON peer_review_assignments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_peer_assignments_reviewer ON peer_review_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_peer_assignments_submission ON peer_review_assignments(submission_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_assignment ON peer_reviews(assignment_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON peer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_submission ON peer_reviews(submission_id);

-- RLS policies
ALTER TABLE peer_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;

-- Students can see their own peer review assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'peer_review_assignments' AND policyname = 'Students view own peer assignments'
    ) THEN
        CREATE POLICY "Students view own peer assignments" ON peer_review_assignments
            FOR SELECT USING (reviewer_id = auth.uid());
    END IF;
END $$;

-- Instructors can manage peer review assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'peer_review_assignments' AND policyname = 'Instructors manage peer assignments'
    ) THEN
        CREATE POLICY "Instructors manage peer assignments" ON peer_review_assignments
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
                )
            );
    END IF;
END $$;

-- Students can manage their own reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'peer_reviews' AND policyname = 'Students manage own reviews'
    ) THEN
        CREATE POLICY "Students manage own reviews" ON peer_reviews
            FOR ALL USING (reviewer_id = auth.uid());
    END IF;
END $$;

-- Students can view reviews of their own submissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'peer_reviews' AND policyname = 'Students view reviews of own submissions'
    ) THEN
        CREATE POLICY "Students view reviews of own submissions" ON peer_reviews
            FOR SELECT USING (
                submission_id IN (
                    SELECT id FROM assignment_submissions WHERE student_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Instructors can view all reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'peer_reviews' AND policyname = 'Instructors view all reviews'
    ) THEN
        CREATE POLICY "Instructors view all reviews" ON peer_reviews
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
                )
            );
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON peer_review_assignments TO authenticated;
GRANT ALL ON peer_reviews TO authenticated;
