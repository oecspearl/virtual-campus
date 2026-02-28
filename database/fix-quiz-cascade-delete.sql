-- ==============================================
-- FIX QUIZ CASCADE DELETE CONSTRAINTS
-- Run this migration to add ON DELETE CASCADE to quiz-related foreign keys
-- ==============================================

-- Drop and recreate the questions foreign key with CASCADE
ALTER TABLE public.questions
DROP CONSTRAINT IF EXISTS questions_quiz_id_fkey;

ALTER TABLE public.questions
ADD CONSTRAINT questions_quiz_id_fkey
FOREIGN KEY (quiz_id)
REFERENCES public.quizzes(id)
ON DELETE CASCADE;

-- Drop and recreate the quiz_attempts foreign key with CASCADE
ALTER TABLE public.quiz_attempts
DROP CONSTRAINT IF EXISTS quiz_attempts_quiz_id_fkey;

ALTER TABLE public.quiz_attempts
ADD CONSTRAINT quiz_attempts_quiz_id_fkey
FOREIGN KEY (quiz_id)
REFERENCES public.quizzes(id)
ON DELETE CASCADE;

-- Verify the constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'quizzes'
ORDER BY tc.table_name;
