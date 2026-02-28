-- Create Missing Gradebook Item
-- This script will create the gradebook item that the student has a grade for

-- 1. First, check if the gradebook item exists
SELECT 
    'Existing Item Check' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM course_grade_items 
            WHERE id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e'
        ) THEN 'EXISTS'
        ELSE 'NOT EXISTS'
    END as item_status;

-- 2. If it doesn't exist, create it
INSERT INTO course_grade_items (
    id,
    course_id,
    title,
    type,
    category,
    points,
    assessment_id,
    is_active,
    created_at,
    updated_at
) VALUES (
    '17d6ab96-8652-465e-8fe2-f7e1e94e157e',
    '79acf81c-be24-4de2-a392-04cba13998d6',
    'Digital Literacy Assessment',
    'quiz',
    'Assessment',
    5,
    NULL, -- No specific assessment linked
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- 3. Verify the item was created/updated
SELECT 
    'After Creation/Update' as status,
    id,
    title,
    type,
    category,
    points,
    is_active,
    course_id,
    created_at
FROM course_grade_items 
WHERE id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e';

-- 4. Check all gradebook items for this course now
SELECT 
    'All Course Items' as status,
    COUNT(*) as total_items,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_items
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6';
