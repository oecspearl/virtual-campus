-- Gamification schema (run in Supabase SQL editor)

-- Profiles: aggregate stats per user
CREATE TABLE IF NOT EXISTS gamification_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp_total BIGINT NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    streak_count INTEGER NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- XP ledger: immutable record of XP transactions
CREATE TABLE IF NOT EXISTS gamification_xp_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_id TEXT,
    course_id UUID,
    lesson_id UUID,
    xp_delta INTEGER NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gx_ledger_user_id ON gamification_xp_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_gx_ledger_event_type ON gamification_xp_ledger(event_type);

-- Enable RLS
ALTER TABLE gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_xp_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own gamification profile" ON gamification_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own xp ledger" ON gamification_xp_ledger
    FOR SELECT USING (user_id = auth.uid());

-- Service role (server) will write; for simplicity allow insert by authenticated user for now
CREATE POLICY "Authenticated can insert ledger for self" ON gamification_xp_ledger
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Helper function: compute level from xp (linear: level every 1,000 xp)
-- Adjust formula as needed later
CREATE OR REPLACE FUNCTION public.g_level_for_xp(xp BIGINT)
RETURNS INTEGER LANGUAGE SQL IMMUTABLE AS $$
  SELECT GREATEST(1, FLOOR(xp / 1000)::int);
$$;

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_touch_gamification_profiles ON gamification_profiles;
CREATE TRIGGER trg_touch_gamification_profiles
BEFORE UPDATE ON gamification_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


