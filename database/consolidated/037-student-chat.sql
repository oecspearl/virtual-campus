-- ============================================================================
-- Part 37: Student chat — direct messages, group rooms, course rooms
-- ============================================================================
-- Depends on: 001 (tenants, users, current_tenant_id, update_updated_at_column),
--             002 (courses)
-- ============================================================================
-- Adds the schema that backs `app/api/messages/**` and the in-app chat UI
-- under `app/messages/`. Four tables:
--
--   * student_chat_rooms          — direct/group/course chat rooms
--   * student_chat_members        — room membership with role + read state
--   * student_chat_messages       — message log (text/image/file/system),
--                                   threaded via reply_to_id
--   * student_chat_blocked_users  — per-user block list to filter senders
--
-- All four tables are tenant-scoped via tenant_id (matching the rest of the
-- app); the API code uses TenantFilteredQuery which auto-applies the
-- tenant_id filter on every query.
--
-- The FK constraint names below (e.g. student_chat_rooms_created_by_fkey)
-- are referenced by relational selects in the API routes —
-- e.g. `users!student_chat_rooms_created_by_fkey(...)`. Renaming a
-- constraint here without updating the API code will break PostgREST joins.
--
-- This migration is idempotent: re-running it is a no-op.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

-- Rooms
CREATE TABLE IF NOT EXISTS public.student_chat_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
                  DEFAULT '00000000-0000-0000-0000-000000000001',
  name            TEXT,
  description     TEXT,
  avatar_url      TEXT,
  room_type       TEXT NOT NULL DEFAULT 'group'
                  CHECK (room_type IN ('direct', 'group', 'study_group', 'course')),
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL CONSTRAINT student_chat_rooms_created_by_fkey
                                REFERENCES public.users(id) ON DELETE CASCADE,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.student_chat_rooms IS
  'Chat rooms for the in-app messaging feature. room_type drives behavior: direct (1:1 DM), group (manual member list), study_group (study-group-bound), course (auto-populated from enrollments).';
COMMENT ON COLUMN public.student_chat_rooms.last_message_at IS
  'Updated by trigger on every non-system message insert; used to sort the room list by recency.';

-- Members
CREATE TABLE IF NOT EXISTS public.student_chat_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
               DEFAULT '00000000-0000-0000-0000-000000000001',
  room_id      UUID NOT NULL REFERENCES public.student_chat_rooms(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL CONSTRAINT student_chat_members_user_id_fkey
                            REFERENCES public.users(id) ON DELETE CASCADE,
  member_role  TEXT NOT NULL DEFAULT 'member'
               CHECK (member_role IN ('owner', 'admin', 'member')),
  is_muted     BOOLEAN NOT NULL DEFAULT false,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_chat_members_room_user_unique UNIQUE (room_id, user_id)
);

COMMENT ON TABLE public.student_chat_members IS
  'Room membership. unread_count is incremented by trigger on incoming messages (skipping the sender) and reset when the user marks the room as read.';

-- Messages
CREATE TABLE IF NOT EXISTS public.student_chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
               DEFAULT '00000000-0000-0000-0000-000000000001',
  room_id      UUID NOT NULL REFERENCES public.student_chat_rooms(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL CONSTRAINT student_chat_messages_sender_id_fkey
                            REFERENCES public.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text'
               CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url     TEXT,
  file_name    TEXT,
  file_type    TEXT,
  file_size    BIGINT,
  reply_to_id  UUID REFERENCES public.student_chat_messages(id) ON DELETE SET NULL,
  is_deleted   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.student_chat_messages IS
  'Individual messages. message_type=system is generated by API for member join/leave events. is_deleted is a soft-delete flag honored by the GET handlers; rows are kept for audit.';

-- Blocked users
CREATE TABLE IF NOT EXISTS public.student_chat_blocked_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
             DEFAULT '00000000-0000-0000-0000-000000000001',
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_chat_blocked_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT student_chat_blocked_not_self CHECK (blocker_id <> blocked_id)
);

COMMENT ON TABLE public.student_chat_blocked_users IS
  'Per-user block list. The DM endpoint refuses to open conversations between blocked pairs; the messages GET handler filters out senders the requester has blocked.';

-- ----------------------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_tenant      ON public.student_chat_rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_created_by  ON public.student_chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_course      ON public.student_chat_rooms(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_type_active ON public.student_chat_rooms(room_type, is_archived);
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_last_msg    ON public.student_chat_rooms(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_student_chat_members_tenant ON public.student_chat_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_members_room   ON public.student_chat_members(room_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_members_user   ON public.student_chat_members(user_id);

CREATE INDEX IF NOT EXISTS idx_student_chat_messages_tenant     ON public.student_chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_messages_room_time  ON public.student_chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_chat_messages_sender     ON public.student_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_messages_reply_to   ON public.student_chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_chat_blocked_tenant  ON public.student_chat_blocked_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_blocked_blocker ON public.student_chat_blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_blocked_blocked ON public.student_chat_blocked_users(blocked_id);

-- ----------------------------------------------------------------------------
-- 3. Triggers
-- ----------------------------------------------------------------------------

-- 3.1 updated_at triggers (uses update_updated_at_column from migration 001)

DROP TRIGGER IF EXISTS update_student_chat_rooms_updated_at ON public.student_chat_rooms;
CREATE TRIGGER update_student_chat_rooms_updated_at BEFORE UPDATE ON public.student_chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_chat_messages_updated_at ON public.student_chat_messages;
CREATE TRIGGER update_student_chat_messages_updated_at BEFORE UPDATE ON public.student_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.2 On new message: bump room.last_message_at and increment recipients'
--     unread_count. System messages bump last_message_at but do not count
--     toward unread (they're metadata, not user content).

CREATE OR REPLACE FUNCTION student_chat_after_message_insert()
RETURNS TRIGGER AS $fn$
BEGIN
  UPDATE public.student_chat_rooms
     SET last_message_at = NEW.created_at
   WHERE id = NEW.room_id;

  IF NEW.message_type <> 'system' THEN
    UPDATE public.student_chat_members
       SET unread_count = unread_count + 1
     WHERE room_id = NEW.room_id
       AND user_id <> NEW.sender_id;
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_chat_after_message_insert_trg ON public.student_chat_messages;
CREATE TRIGGER student_chat_after_message_insert_trg
  AFTER INSERT ON public.student_chat_messages
  FOR EACH ROW EXECUTE FUNCTION student_chat_after_message_insert();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------------------
-- The API uses the service role (TenantFilteredQuery) which bypasses RLS, so
-- these policies primarily protect against direct client-side queries (e.g.
-- if anyone subscribes to realtime channels with the anon/auth client).
--
-- Pattern: tenant_id = current_tenant_id() AND user is a member of the room
-- (or the row is the user's own membership/block entry).
-- ----------------------------------------------------------------------------

ALTER TABLE public.student_chat_rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_chat_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_chat_blocked_users ENABLE ROW LEVEL SECURITY;

-- Rooms: a user can read a room if they are a member of it.
DROP POLICY IF EXISTS "Members read their chat rooms" ON public.student_chat_rooms;
CREATE POLICY "Members read their chat rooms" ON public.student_chat_rooms
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.student_chat_members m
       WHERE m.room_id = student_chat_rooms.id
         AND m.user_id = auth.uid()
    )
  );

-- Members: a user can read membership rows for rooms they belong to.
-- (Self-row read is implied since a user is a member of their own room.)
DROP POLICY IF EXISTS "Members read room rosters" ON public.student_chat_members;
CREATE POLICY "Members read room rosters" ON public.student_chat_members
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.student_chat_members self
       WHERE self.room_id = student_chat_members.room_id
         AND self.user_id = auth.uid()
    )
  );

-- Messages: a user can read messages from rooms they belong to.
DROP POLICY IF EXISTS "Members read room messages" ON public.student_chat_messages;
CREATE POLICY "Members read room messages" ON public.student_chat_messages
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.student_chat_members m
       WHERE m.room_id = student_chat_messages.room_id
         AND m.user_id = auth.uid()
    )
  );

-- Blocked users: a user can read and manage their own block list.
DROP POLICY IF EXISTS "Users manage own block list" ON public.student_chat_blocked_users;
CREATE POLICY "Users manage own block list" ON public.student_chat_blocked_users
  FOR ALL USING (
    tenant_id = current_tenant_id() AND blocker_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- 5. Refresh PostgREST schema cache so the new tables become visible
-- ----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
