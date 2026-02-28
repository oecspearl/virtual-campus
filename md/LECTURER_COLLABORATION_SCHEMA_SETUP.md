# Lecturer Collaboration Schema Setup

## Quick Check: Verify Tables Exist

Run this SQL in your Supabase SQL Editor to check if the tables exist:

```sql
-- Check if lecturer collaboration tables exist
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
```

## Apply the Schema

If any tables are missing, follow these steps:

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**

### Step 2: Run the Schema

1. Open the file `database/lecturer-collaboration-schema.sql` in your project
2. Copy the **entire contents** of the file
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Installation

After running the schema, verify it worked:

```sql
-- Should return 12 rows (one for each table)
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'lecturer%';
```

Expected result: `table_count = 12`

### Step 4: Check RLS Policies

Verify Row Level Security policies are in place:

```sql
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename LIKE 'lecturer%'
ORDER BY tablename, policyname;
```

You should see multiple policies for each table (SELECT, INSERT, UPDATE, DELETE).

## Troubleshooting

### Error: "relation does not exist"

This means the tables haven't been created. Run the schema file as described in Step 2.

### Error: "permission denied"

Check that RLS policies are correctly set up. The schema file includes all necessary policies.

### Error: "duplicate key value"

The tables already exist. You can safely ignore this or drop and recreate if needed:

```sql
-- WARNING: This will delete all data in these tables!
DROP TABLE IF EXISTS lecturer_message_reactions CASCADE;
DROP TABLE IF EXISTS lecturer_messages CASCADE;
DROP TABLE IF EXISTS lecturer_chat_room_members CASCADE;
DROP TABLE IF EXISTS lecturer_chat_rooms CASCADE;
DROP TABLE IF EXISTS lecturer_resource_bookmarks CASCADE;
DROP TABLE IF EXISTS lecturer_resource_downloads CASCADE;
DROP TABLE IF EXISTS lecturer_resource_ratings CASCADE;
DROP TABLE IF EXISTS lecturer_resources CASCADE;
DROP TABLE IF EXISTS lecturer_forum_votes CASCADE;
DROP TABLE IF EXISTS lecturer_forum_replies CASCADE;
DROP TABLE IF EXISTS lecturer_forum_posts CASCADE;
DROP TABLE IF EXISTS lecturer_forums CASCADE;
```

Then re-run the schema file.

## Required Tables

The lecturer collaboration feature requires these 12 tables:

1. `lecturer_forums` - Discussion forums
2. `lecturer_forum_posts` - Posts within forums
3. `lecturer_forum_replies` - Replies to posts
4. `lecturer_forum_votes` - Votes on posts/replies
5. `lecturer_resources` - Shared educational resources
6. `lecturer_resource_ratings` - Ratings for resources
7. `lecturer_resource_downloads` - Download tracking
8. `lecturer_resource_bookmarks` - User bookmarks
9. `lecturer_chat_rooms` - Chat rooms
10. `lecturer_chat_room_members` - Room membership
11. `lecturer_messages` - Chat messages
12. `lecturer_message_reactions` - Message reactions (optional)

## Next Steps

After applying the schema:

1. ✅ Verify all 12 tables exist
2. ✅ Check RLS policies are active
3. ✅ Test the API endpoints
4. ✅ Try accessing the lecturer collaboration pages




