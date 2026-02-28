-- Fix Missing Assignment Course ID
-- This script fixes the specific assignment that was missing course_id

-- Fix the specific assignment that's missing course_id
UPDATE assignments 
SET course_id = lessons.course_id 
FROM lessons 
WHERE assignments.id = 'badb56fe-e8df-4ff7-8824-a1e2544d1670'
AND assignments.lesson_id = lessons.id 
AND assignments.course_id IS NULL;

-- Also backfill ALL assignments that are missing course_id
UPDATE assignments 
SET course_id = lessons.course_id 
FROM lessons 
WHERE assignments.lesson_id = lessons.id 
AND assignments.course_id IS NULL;

-- Verify the fix
SELECT 
    a.id,
    a.title,
    a.course_id,
    a.lesson_id,
    l.course_id as lesson_course_id,
    c.title as course_title
FROM assignments a
LEFT JOIN lessons l ON a.lesson_id = l.id
LEFT JOIN courses c ON COALESCE(a.course_id, l.course_id) = c.id
WHERE a.id = 'badb56fe-e8df-4ff7-8824-a1e2544d1670';

