-- Fix for infinite recursion in lecturer_chat_room_members RLS policy
-- Run this in Supabase SQL Editor to fix the RLS policy issue

-- Create helper function to check room membership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_room_member(check_user_id UUID, check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lecturer_chat_room_members
        WHERE user_id = check_user_id AND room_id = check_room_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a room admin/moderator (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_room_admin(check_user_id UUID, check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lecturer_chat_room_members
        WHERE user_id = check_user_id 
        AND room_id = check_room_id 
        AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Lecturers can view room members" ON lecturer_chat_room_members;
CREATE POLICY "Lecturers can view room members" ON lecturer_chat_room_members FOR SELECT
USING (
    is_lecturer(auth.uid()) AND (
        user_id = auth.uid() OR
        is_room_member(auth.uid(), room_id)
    )
);

-- Fix the INSERT policy to avoid recursion
DROP POLICY IF EXISTS "Room admins can add members" ON lecturer_chat_room_members;
CREATE POLICY "Room admins can add members" ON lecturer_chat_room_members FOR INSERT
WITH CHECK (
    is_lecturer(auth.uid()) AND
    is_lecturer(user_id) AND
    (
        EXISTS (
            SELECT 1 FROM lecturer_chat_rooms 
            WHERE id = room_id AND created_by = auth.uid()
        ) OR
        is_room_admin(auth.uid(), room_id)
    )
);

