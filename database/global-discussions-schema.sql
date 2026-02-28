-- =============================================================================
-- GLOBAL DISCUSSIONS SCHEMA
-- Platform-wide student discussions (not tied to courses/lessons)
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CATEGORIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS global_discussion_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon name from @iconify/react
    color VARCHAR(20), -- Tailwind color class
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO global_discussion_categories (name, slug, description, icon, color, display_order) VALUES
    ('General', 'general', 'General platform discussions', 'mdi:forum', 'blue', 1),
    ('Academic', 'academic', 'Academic questions and study help', 'mdi:school', 'green', 2),
    ('Campus Life', 'campus-life', 'Campus events and social topics', 'mdi:account-group', 'purple', 3),
    ('Career & Jobs', 'career-jobs', 'Career advice and job opportunities', 'mdi:briefcase', 'amber', 4),
    ('Technical Support', 'technical-support', 'Platform help and technical issues', 'mdi:help-circle', 'red', 5),
    ('Announcements', 'announcements', 'Official platform announcements', 'mdi:bullhorn', 'indigo', 0)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- GLOBAL DISCUSSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS global_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES global_discussion_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- GLOBAL DISCUSSION REPLIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS global_discussion_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES global_discussions(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES global_discussion_replies(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- GLOBAL DISCUSSION VOTES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS global_discussion_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES global_discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES global_discussion_replies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure vote is for discussion OR reply, not both
    CHECK (
        (discussion_id IS NOT NULL AND reply_id IS NULL) OR
        (discussion_id IS NULL AND reply_id IS NOT NULL)
    )
);

-- =============================================================================
-- GLOBAL DISCUSSION SUBSCRIPTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS global_discussion_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES global_discussions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notify_on_reply BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discussion_id, user_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_global_discussion_categories_slug ON global_discussion_categories(slug);
CREATE INDEX IF NOT EXISTS idx_global_discussion_categories_order ON global_discussion_categories(display_order);

-- Discussions indexes
CREATE INDEX IF NOT EXISTS idx_global_discussions_category_id ON global_discussions(category_id);
CREATE INDEX IF NOT EXISTS idx_global_discussions_author_id ON global_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_global_discussions_created_at ON global_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_discussions_last_activity ON global_discussions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_discussions_pinned_activity ON global_discussions(is_pinned DESC, last_activity_at DESC);

-- Replies indexes
CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_discussion_id ON global_discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_author_id ON global_discussion_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_parent_id ON global_discussion_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_created_at ON global_discussion_replies(created_at DESC);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_global_discussion_votes_discussion_id ON global_discussion_votes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_votes_reply_id ON global_discussion_votes(reply_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_votes_user_id ON global_discussion_votes(user_id);

-- Unique partial indexes for votes (one vote per user per discussion/reply)
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_discussion_votes_discussion_user
    ON global_discussion_votes(discussion_id, user_id)
    WHERE discussion_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_discussion_votes_reply_user
    ON global_discussion_votes(reply_id, user_id)
    WHERE reply_id IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_global_discussions_search
    ON global_discussions USING GIN (to_tsvector('english', title || ' ' || content));

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_global_discussion_subscriptions_discussion ON global_discussion_subscriptions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_subscriptions_user ON global_discussion_subscriptions(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE global_discussion_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_discussion_subscriptions ENABLE ROW LEVEL SECURITY;

-- Categories policies (everyone can read active, only admins can write)
DROP POLICY IF EXISTS "Anyone can view active categories" ON global_discussion_categories;
CREATE POLICY "Anyone can view active categories" ON global_discussion_categories FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON global_discussion_categories;
CREATE POLICY "Admins can manage categories" ON global_discussion_categories FOR ALL
USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin')));

-- Discussions policies
DROP POLICY IF EXISTS "Anyone can view discussions" ON global_discussions;
CREATE POLICY "Anyone can view discussions" ON global_discussions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create discussions" ON global_discussions;
CREATE POLICY "Authenticated users can create discussions" ON global_discussions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update their own discussions" ON global_discussions;
CREATE POLICY "Authors can update their own discussions" ON global_discussions FOR UPDATE
USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Authors and admins can delete discussions" ON global_discussions;
CREATE POLICY "Authors and admins can delete discussions" ON global_discussions FOR DELETE
USING (
    auth.uid() = author_id OR
    auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
);

-- Replies policies
DROP POLICY IF EXISTS "Anyone can view visible replies" ON global_discussion_replies;
CREATE POLICY "Anyone can view visible replies" ON global_discussion_replies FOR SELECT
USING (is_hidden = false OR auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Authenticated users can create replies" ON global_discussion_replies;
CREATE POLICY "Authenticated users can create replies" ON global_discussion_replies FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = author_id AND
    NOT EXISTS (
        SELECT 1 FROM global_discussions
        WHERE id = discussion_id AND is_locked = true
    )
);

DROP POLICY IF EXISTS "Authors can update their own replies" ON global_discussion_replies;
CREATE POLICY "Authors can update their own replies" ON global_discussion_replies FOR UPDATE
USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Authors and admins can delete replies" ON global_discussion_replies;
CREATE POLICY "Authors and admins can delete replies" ON global_discussion_replies FOR DELETE
USING (
    auth.uid() = author_id OR
    auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
);

-- Votes policies
DROP POLICY IF EXISTS "Anyone can read votes" ON global_discussion_votes;
CREATE POLICY "Anyone can read votes" ON global_discussion_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON global_discussion_votes;
CREATE POLICY "Authenticated users can vote" ON global_discussion_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON global_discussion_votes;
CREATE POLICY "Users can update their own votes" ON global_discussion_votes FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON global_discussion_votes;
CREATE POLICY "Users can delete their own votes" ON global_discussion_votes FOR DELETE
USING (auth.uid() = user_id);

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON global_discussion_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON global_discussion_subscriptions FOR ALL
USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update reply count and last_activity_at when replies change
CREATE OR REPLACE FUNCTION update_global_discussion_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE global_discussions
        SET
            reply_count = reply_count + 1,
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.discussion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE global_discussions
        SET
            reply_count = GREATEST(0, reply_count - 1),
            updated_at = NOW()
        WHERE id = OLD.discussion_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_global_discussion_reply_stats ON global_discussion_replies;
CREATE TRIGGER trigger_update_global_discussion_reply_stats
    AFTER INSERT OR DELETE ON global_discussion_replies
    FOR EACH ROW EXECUTE FUNCTION update_global_discussion_reply_stats();

-- Update vote counts on discussions
CREATE OR REPLACE FUNCTION update_global_discussion_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        -- Update discussion vote count
        IF COALESCE(NEW.discussion_id, OLD.discussion_id) IS NOT NULL THEN
            UPDATE global_discussions
            SET vote_count = (
                SELECT COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END), 0)
                FROM global_discussion_votes
                WHERE discussion_id = COALESCE(NEW.discussion_id, OLD.discussion_id)
            ),
            updated_at = NOW()
            WHERE id = COALESCE(NEW.discussion_id, OLD.discussion_id);
        END IF;

        -- Update reply vote count
        IF COALESCE(NEW.reply_id, OLD.reply_id) IS NOT NULL THEN
            UPDATE global_discussion_replies
            SET vote_count = (
                SELECT COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END), 0)
                FROM global_discussion_votes
                WHERE reply_id = COALESCE(NEW.reply_id, OLD.reply_id)
            ),
            updated_at = NOW()
            WHERE id = COALESCE(NEW.reply_id, OLD.reply_id);
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_global_discussion_vote_count ON global_discussion_votes;
CREATE TRIGGER trigger_update_global_discussion_vote_count
    AFTER INSERT OR UPDATE OR DELETE ON global_discussion_votes
    FOR EACH ROW EXECUTE FUNCTION update_global_discussion_vote_count();

-- Auto-subscribe author to their discussion
CREATE OR REPLACE FUNCTION auto_subscribe_discussion_author()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO global_discussion_subscriptions (discussion_id, user_id, notify_on_reply)
    VALUES (NEW.id, NEW.author_id, true)
    ON CONFLICT (discussion_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_subscribe_discussion_author ON global_discussions;
CREATE TRIGGER trigger_auto_subscribe_discussion_author
    AFTER INSERT ON global_discussions
    FOR EACH ROW EXECUTE FUNCTION auto_subscribe_discussion_author();

-- =============================================================================
-- VERIFY SETUP
-- =============================================================================

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename LIKE 'global_discussion%'
ORDER BY tablename, policyname;
