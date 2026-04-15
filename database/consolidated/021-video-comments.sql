-- ============================================================================
-- 021: Video Comments (Timestamped Video Discussion Thread)
-- Lightweight table for public discussion comments anchored to video timestamps.
-- Each top-level comment captures the video playback position.
-- Replies are flat (no timestamp) and reference the parent comment.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE,
  video_timestamp INTEGER,          -- seconds into the video (NULL for replies)
  body TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_comments_tenant ON public.video_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_lesson ON public.video_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_author ON public.video_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON public.video_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_lesson_ts ON public.video_comments(lesson_id, video_timestamp);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_video_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_video_comments_updated_at
  BEFORE UPDATE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION update_video_comments_updated_at();

-- RLS
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read comments in their tenant
CREATE POLICY video_comments_select ON public.video_comments
  FOR SELECT USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY video_comments_insert ON public.video_comments
  FOR INSERT WITH CHECK (author_id = auth.uid());

-- Authors can update their own comments
CREATE POLICY video_comments_update ON public.video_comments
  FOR UPDATE USING (author_id = auth.uid());

-- Authors + staff can delete
CREATE POLICY video_comments_delete ON public.video_comments
  FOR DELETE USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor')
    )
  );
