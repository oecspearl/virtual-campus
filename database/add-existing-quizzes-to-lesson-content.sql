-- Add existing quizzes to their lesson content
-- This script will add quizzes that don't appear in lesson content to their respective lessons

-- First, let's see what we're working with
SELECT 
    'Quizzes without lesson content' as status,
    COUNT(*) as count
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.lesson_id IS NOT NULL 
  AND l.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM lessons l2 
    WHERE l2.id = q.lesson_id 
      AND l2.content::text LIKE '%' || q.id || '%'
  );

-- Show some examples
SELECT 
    'Example quizzes to add' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    l.id as lesson_id,
    l.title as lesson_title,
    jsonb_array_length(COALESCE(l.content, '[]'::jsonb)) as current_content_length
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.lesson_id IS NOT NULL 
  AND l.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM lessons l2 
    WHERE l2.id = q.lesson_id 
      AND l2.content::text LIKE '%' || q.id || '%'
  )
LIMIT 10;

-- Update lessons to include their quizzes in content
-- This is a complex operation, so we'll do it step by step

-- Step 1: Create a function to add quiz to lesson content
CREATE OR REPLACE FUNCTION add_quiz_to_lesson_content(quiz_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    lesson_record RECORD;
    current_content JSONB;
    quiz_content_item JSONB;
    updated_content JSONB;
BEGIN
    -- Get the lesson for this quiz
    SELECT l.id, l.content, q.title, q.description, q.points, q.time_limit, q.attempts_allowed
    INTO lesson_record
    FROM lessons l
    JOIN quizzes q ON q.lesson_id = l.id
    WHERE q.id = quiz_uuid;
    
    -- If no lesson found, return false
    IF lesson_record.id IS NULL THEN
        RAISE NOTICE 'No lesson found for quiz %', quiz_uuid;
        RETURN FALSE;
    END IF;
    
    -- Check if quiz already exists in content
    IF lesson_record.content::text LIKE '%' || quiz_uuid || '%' THEN
        RAISE NOTICE 'Quiz % already exists in lesson % content', quiz_uuid, lesson_record.id;
        RETURN TRUE;
    END IF;
    
    -- Parse current content or initialize as empty array
    current_content := COALESCE(lesson_record.content, '[]'::jsonb);
    
    -- Create quiz content item
    quiz_content_item := jsonb_build_object(
        'type', 'quiz',
        'title', lesson_record.title,
        'data', jsonb_build_object(
            'quizId', quiz_uuid,
            'description', COALESCE(lesson_record.description, ''),
            'points', COALESCE(lesson_record.points, 100),
            'timeLimit', lesson_record.time_limit,
            'attemptsAllowed', COALESCE(lesson_record.attempts_allowed, 1)
        ),
        'id', 'quiz-' || quiz_uuid
    );
    
    -- Add quiz to content array
    updated_content := current_content || quiz_content_item;
    
    -- Update lesson content
    UPDATE lessons 
    SET content = updated_content,
        updated_at = NOW()
    WHERE id = lesson_record.id;
    
    RAISE NOTICE 'Added quiz % to lesson % content', quiz_uuid, lesson_record.id;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding quiz % to lesson content: %', quiz_uuid, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Add all quizzes to their lesson content
DO $$
DECLARE
    quiz_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through all quizzes that have lesson_id but aren't in lesson content
    FOR quiz_record IN 
        SELECT q.id, q.title, l.id as lesson_id, l.title as lesson_title
        FROM quizzes q
        LEFT JOIN lessons l ON q.lesson_id = l.id
        WHERE q.lesson_id IS NOT NULL 
          AND l.id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 
            FROM lessons l2 
            WHERE l2.id = q.lesson_id 
              AND l2.content::text LIKE '%' || q.id || '%'
          )
    LOOP
        IF add_quiz_to_lesson_content(quiz_record.id) THEN
            success_count := success_count + 1;
        ELSE
            error_count := error_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Quiz content update complete: % successful, % errors', success_count, error_count;
END $$;

-- Step 3: Verify the results
SELECT 
    'After update - quizzes in lesson content' as status,
    COUNT(*) as count
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.lesson_id IS NOT NULL 
  AND l.id IS NOT NULL
  AND l.content::text LIKE '%' || q.id || '%';

-- Step 4: Show some examples of updated lessons
SELECT 
    'Updated lesson examples' as status,
    l.id as lesson_id,
    l.title as lesson_title,
    jsonb_array_length(l.content) as content_items,
    (
        SELECT COUNT(*) 
        FROM jsonb_array_elements(l.content) elem 
        WHERE elem->>'type' = 'quiz'
    ) as quiz_count
FROM lessons l
WHERE l.content IS NOT NULL 
  AND jsonb_array_length(l.content) > 0
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(l.content) elem 
    WHERE elem->>'type' = 'quiz'
  )
ORDER BY l.updated_at DESC
LIMIT 5;

-- Clean up the function
DROP FUNCTION add_quiz_to_lesson_content(UUID);
