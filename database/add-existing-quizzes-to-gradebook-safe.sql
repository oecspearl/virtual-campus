-- Add existing quizzes to gradebook that are missing grade items
-- This is a safer version that handles duplicates gracefully

-- First, let's see what we're working with
SELECT 
    'Quizzes without gradebook items' as status,
    COUNT(*) as count
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.lesson_id IS NOT NULL 
  AND l.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM course_grade_items cgi 
    WHERE cgi.course_id = l.course_id 
      AND cgi.assessment_id = q.id 
      AND cgi.type = 'quiz'
  );

-- Show some examples
SELECT 
    'Example quizzes to add to gradebook' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    l.course_id,
    c.title as course_title
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
WHERE q.lesson_id IS NOT NULL 
  AND l.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM course_grade_items cgi 
    WHERE cgi.course_id = l.course_id 
      AND cgi.assessment_id = q.id 
      AND cgi.type = 'quiz'
  )
LIMIT 10;

-- Create gradebook items for quizzes that don't have them
-- Using a step-by-step approach to avoid conflicts
DO $$
DECLARE
    quiz_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through quizzes that need gradebook items
    FOR quiz_record IN 
        SELECT 
            q.id as quiz_id,
            q.title as quiz_title,
            q.points as quiz_points,
            q.due_date as quiz_due_date,
            l.course_id as lesson_course_id
        FROM quizzes q
        LEFT JOIN lessons l ON q.lesson_id = l.id
        WHERE q.lesson_id IS NOT NULL 
          AND l.course_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 
            FROM course_grade_items cgi 
            WHERE cgi.course_id = l.course_id 
              AND cgi.assessment_id = q.id 
              AND cgi.type = 'quiz'
          )
    LOOP
        BEGIN
            -- Insert gradebook item for this quiz
            INSERT INTO course_grade_items (
                course_id,
                title,
                type,
                category,
                points,
                assessment_id,
                due_date,
                weight,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                quiz_record.lesson_course_id,
                quiz_record.quiz_title,
                'quiz',
                'Quizzes',
                COALESCE(quiz_record.quiz_points, 100),
                quiz_record.quiz_id,
                quiz_record.quiz_due_date,
                1.0,
                true,
                NOW(),
                NOW()
            );
            
            success_count := success_count + 1;
            RAISE NOTICE 'Created gradebook item for quiz: %', quiz_record.quiz_title;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE 'Error creating gradebook item for quiz %: %', quiz_record.quiz_title, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Gradebook update complete: % successful, % errors', success_count, error_count;
END $$;

-- Show results
SELECT 
    'After update - quizzes with gradebook items' as status,
    COUNT(*) as count
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.lesson_id IS NOT NULL 
  AND l.course_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM course_grade_items cgi 
    WHERE cgi.course_id = l.course_id 
      AND cgi.assessment_id = q.id 
      AND cgi.type = 'quiz'
  );

-- Show some examples of created gradebook items
SELECT 
    'Created gradebook items' as status,
    cgi.id as grade_item_id,
    cgi.title,
    cgi.points,
    cgi.assessment_id as quiz_id,
    c.title as course_title,
    cgi.created_at
FROM course_grade_items cgi
LEFT JOIN courses c ON cgi.course_id = c.id
WHERE cgi.type = 'quiz'
  AND cgi.created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY cgi.created_at DESC
LIMIT 10;
