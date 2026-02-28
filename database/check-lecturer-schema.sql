-- Quick check script to verify lecturer collaboration tables exist
-- Run this in Supabase SQL Editor to check if the schema has been applied

-- Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'lecturer_forums',
            'lecturer_forum_posts',
            'lecturer_forum_replies',
            'lecturer_forum_votes',
            'lecturer_resources',
            'lecturer_resource_ratings',
            'lecturer_resource_downloads',
            'lecturer_resource_bookmarks',
            'lecturer_chat_rooms',
            'lecturer_chat_room_members',
            'lecturer_messages',
            'lecturer_message_reactions'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'lecturer%'
ORDER BY table_name;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename LIKE 'lecturer%'
ORDER BY tablename, policyname;

