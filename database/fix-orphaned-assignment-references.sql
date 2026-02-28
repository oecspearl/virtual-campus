-- Fix Orphaned Assignment References
-- This script cleans up references to deleted assignments

-- 1. Check for orphaned assignment references in lessons content
SELECT 
    'Orphaned Assignment References in Lessons' as status,
    l.id as lesson_id,
    l.title as lesson_title,
    l.content as lesson_content
FROM lessons l
WHERE l.content::text LIKE '%assignment%'
  AND l.content::text LIKE '%5bf4fa7a-bdb6-4043-9aa4-330f7350daaf%';

-- 2. Check if the assignment exists
SELECT 
    'Assignment Exists Check' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM assignments WHERE id = '5bf4fa7a-bdb6-4043-9aa4-330f7350daaf') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as assignment_status;

-- 3. Find all lessons that reference this assignment
WITH assignment_refs AS (
    SELECT 
        l.id as lesson_id,
        l.title as lesson_title,
        l.content,
        jsonb_array_elements(l.content) as content_item
    FROM lessons l
    WHERE l.content::text LIKE '%5bf4fa7a-bdb6-4043-9aa4-330f7350daaf%'
)
SELECT 
    'Lessons with Assignment Reference' as status,
    lesson_id,
    lesson_title,
    content_item
FROM assignment_refs
WHERE content_item->>'type' = 'assignment' 
  AND content_item->'data'->>'assignmentId' = '5bf4fa7a-bdb6-4043-9aa4-330f7350daaf';

-- 4. Remove the orphaned assignment reference from lessons
UPDATE lessons 
SET content = (
    SELECT jsonb_agg(item)
    FROM jsonb_array_elements(content) as item
    WHERE NOT (
        item->>'type' = 'assignment' 
        AND item->'data'->>'assignmentId' = '5bf4fa7a-bdb6-4043-9aa4-330f7350daaf'
    )
)
WHERE content::text LIKE '%5bf4fa7a-bdb6-4043-9aa4-330f7350daaf%';

-- 5. Verify cleanup
SELECT 
    'After Cleanup - Remaining References' as status,
    COUNT(*) as lessons_with_reference
FROM lessons 
WHERE content::text LIKE '%5bf4fa7a-bdb6-4043-9aa4-330f7350daaf%';

-- 6. Check for any other orphaned assignment references
SELECT 
    'All Orphaned Assignment References' as status,
    l.id as lesson_id,
    l.title as lesson_title,
    content_item->>'type' as content_type,
    content_item->'data'->>'assignmentId' as assignment_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM assignments WHERE id = (content_item->'data'->>'assignmentId')::uuid)
        THEN 'EXISTS'
        ELSE 'ORPHANED'
    END as assignment_status
FROM lessons l,
     jsonb_array_elements(l.content) as content_item
WHERE content_item->>'type' = 'assignment'
  AND content_item->'data'->>'assignmentId' IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM assignments 
      WHERE id = (content_item->'data'->>'assignmentId')::uuid
  );
